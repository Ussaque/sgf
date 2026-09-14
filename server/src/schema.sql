CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  plan ENUM('FREE', 'PRO', 'ENTERPRISE') NOT NULL DEFAULT 'FREE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS companies (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  nuit VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  logo_url VARCHAR(500) NULL,
  brand_color VARCHAR(20) NULL,
  color_theme VARCHAR(50) NULL,
  default_tax_rate DOUBLE NULL,
  default_due_days INT NULL,
  mpesa_number VARCHAR(50) NULL,
  emola_number VARCHAR(50) NULL,
  payment_notes TEXT NULL,
  current_invoice_sequence INT NOT NULL DEFAULT 1,
  current_receipt_sequence INT NOT NULL DEFAULT 1,
  current_quotation_sequence INT NOT NULL DEFAULT 1,
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  INDEX (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS bank_accounts (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_holder VARCHAR(255) NULL,
  account_number VARCHAR(100) NOT NULL,
  nib VARCHAR(100) NULL,
  iban VARCHAR(100) NULL,
  swift_code VARCHAR(50) NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'MZN',
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  organization_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('SUPER_ADMIN', 'ADMIN', 'USER', 'VIEWER') NOT NULL DEFAULT 'USER',
  FOREIGN KEY (organization_id) REFERENCES organizations(id),
  INDEX (organization_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS user_company_access (
  user_id VARCHAR(36) NOT NULL,
  company_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (user_id, company_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  nuit VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT NULL,
  unit VARCHAR(100) NOT NULL,
  unit_price DOUBLE NOT NULL,
  tax_rate DOUBLE NULL,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NOT NULL,
  number VARCHAR(50) NOT NULL,
  date DATETIME NOT NULL,
  due_date DATETIME NOT NULL,
  status ENUM('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED') NOT NULL DEFAULT 'SENT',
  subtotal DOUBLE NOT NULL,
  tax_total DOUBLE NOT NULL,
  total DOUBLE NOT NULL,
  notes TEXT NULL,
  reference TEXT NULL,
  created_by VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  INDEX (company_id),
  INDEX (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS invoice_items (
  id VARCHAR(36) PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  quantity DOUBLE NOT NULL,
  unit_price DOUBLE NOT NULL,
  tax_rate DOUBLE NOT NULL,
  total DOUBLE NOT NULL,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotations (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  client_id VARCHAR(36) NOT NULL,
  number VARCHAR(50) NOT NULL,
  date DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  status ENUM('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED') NOT NULL DEFAULT 'DRAFT',
  subtotal DOUBLE NOT NULL,
  tax_total DOUBLE NOT NULL,
  total DOUBLE NOT NULL,
  notes TEXT NULL,
  reference TEXT NULL,
  created_by VARCHAR(255) NULL,
  converted_invoice_id VARCHAR(36) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (client_id) REFERENCES clients(id),
  INDEX (company_id),
  INDEX (client_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS quotation_items (
  id VARCHAR(36) PRIMARY KEY,
  quotation_id VARCHAR(36) NOT NULL,
  description TEXT NOT NULL,
  quantity DOUBLE NOT NULL,
  unit_price DOUBLE NOT NULL,
  tax_rate DOUBLE NOT NULL,
  total DOUBLE NOT NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  INDEX (quotation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS receipts (
  id VARCHAR(36) PRIMARY KEY,
  company_id VARCHAR(36) NOT NULL,
  invoice_id VARCHAR(36) NOT NULL,
  number VARCHAR(50) NOT NULL,
  date DATETIME NOT NULL,
  amount DOUBLE NOT NULL,
  method ENUM('CASH', 'BANK_TRANSFER', 'CHECK', 'POS', 'MOBILE_MONEY') NOT NULL,
  reference VARCHAR(255) NULL,
  voided TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(id),
  INDEX (company_id),
  INDEX (invoice_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS color_theme VARCHAR(50) NULL;
