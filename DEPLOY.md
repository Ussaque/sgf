# Deploy no VPS

Assume um VPS Ubuntu/Debian com acesso root/sudo via SSH. Se for outra distro, os comandos de instalação de pacotes mudam, o resto é igual.

## 1. Preparar o VPS

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx mysql-server git

# Node.js (via nvm, evita versões antigas do apt)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 22

# PM2, para manter a API sempre a correr e reiniciar sozinha
npm install -g pm2
```

## 2. Base de dados

Nunca uses `root` sem password em produção (isso só é aceitável em dev local). Cria um utilizador dedicado:

```sql
sudo mysql
CREATE DATABASE moz_billing_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mbs_app'@'localhost' IDENTIFIED BY 'uma-password-forte-aqui';
GRANT ALL PRIVILEGES ON moz_billing_system.* TO 'mbs_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Levar o código para o servidor

```bash
cd /var/www
sudo git clone <url-do-teu-repo> moz-billing-system
sudo chown -R $USER:$USER moz-billing-system
cd moz-billing-system
```

(Se ainda não tens o código num repositório Git remoto, faz isso primeiro — `git init`, `git remote add origin ...`, `git push` — ou usa `scp`/`rsync` para copiar a pasta diretamente.)

## 4. Backend

```bash
cd server
npm ci
cp .env.example .env
nano .env   # DATABASE_URL com o utilizador mbs_app, JWT_SECRET forte e aleatório, CORS_ORIGIN com o teu domínio
npx prisma migrate deploy   # aplica as migrations (nunca uses "migrate dev" em produção)
npx prisma db seed          # só na primeira vez, para os dados iniciais
npm run build

pm2 start ecosystem.config.js
pm2 save
pm2 startup   # segue a instrução que aparece para a API arrancar sozinha depois de um reboot
```

Gera o `JWT_SECRET` com algo como `openssl rand -base64 48`.

## 5. Frontend

Como o Nginx (passo 6) vai servir o frontend e a API no mesmo domínio, usa um caminho relativo:

```bash
cd ..   # raiz do projeto
cp .env.production.example .env.production
npm ci
npm run build
```

Isto gera `dist/` com os ficheiros estáticos.

## 6. Nginx

```bash
sudo cp deploy/nginx.conf.example /etc/nginx/sites-available/moz-billing-system
sudo nano /etc/nginx/sites-available/moz-billing-system   # ajusta server_name e o caminho para dist/
sudo ln -s /etc/nginx/sites-available/moz-billing-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

O Certbot atualiza o `nginx.conf` sozinho para redirecionar para HTTPS e renova o certificado automaticamente.

## 8. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Não abras a porta 3001 nem a 3306 ao exterior — a API só precisa de ser acedida pelo Nginx (mesma máquina), e o MySQL só pelo backend.

## Deploys seguintes (depois do primeiro)

```bash
cd /var/www/moz-billing-system
git pull

cd server
npm ci
npx prisma migrate deploy   # só se houver migrations novas
npm run build
pm2 restart moz-billing-api

cd ..
npm ci
npm run build   # o Nginx já serve o dist/ atualizado, sem precisar de reiniciar nada
```

## Checklist antes de ires para produção

- [ ] `JWT_SECRET` mudado para um valor aleatório forte (nunca o `dev-only-secret-change-me`)
- [ ] Password da base de dados não é vazia, utilizador não é `root`
- [ ] `CORS_ORIGIN` aponta para o domínio real, não `localhost`
- [ ] `.env` e `.env.production` não estão no Git (já cobertos pelo `.gitignore`)
- [ ] HTTPS ativo
- [ ] `server/uploads/` tem espaço em disco e idealmente entra num backup regular
