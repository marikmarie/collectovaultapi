-- Create Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customerId INT NOT NULL,
  transactionId INT NOT NULL,
  orderRating INT NOT NULL COMMENT '1-5 stars',
  paymentRating INT NOT NULL COMMENT '1-5 stars',
  serviceRating INT NOT NULL COMMENT '1-5 stars',
  overallRating INT NOT NULL COMMENT '1-5 stars',
  comment TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (transactionId) REFERENCES transactions(id) ON DELETE CASCADE,
  UNIQUE KEY unique_transaction_rating (transactionId)
);

-- Create Feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customerId INT NOT NULL,
  feedbackType VARCHAR(50) NOT NULL COMMENT 'order, service, app, general',
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  attachments JSON COMMENT 'URLs to attached images/files',
  status VARCHAR(50) DEFAULT 'open' COMMENT 'open, in-progress, resolved, closed',
  priority VARCHAR(50) DEFAULT 'medium' COMMENT 'low, medium, high, critical',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_status (status),
  INDEX idx_feedbackType (feedbackType),
  INDEX idx_customerId (customerId)
);

-- Create Chat Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customerId INT NOT NULL,
  senderType VARCHAR(50) NOT NULL COMMENT 'customer, support',
  message TEXT NOT NULL,
  attachments JSON COMMENT 'URLs to attached images',
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  INDEX idx_customerId (customerId),
  INDEX idx_isRead (isRead),
  INDEX idx_createdAt (createdAt)
);

-- Create WhatsApp Contact table
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customerId INT NOT NULL,
  whatsappNumber VARCHAR(20) NOT NULL COMMENT 'with country code, e.g., +254712345678',
  isPreferred BOOLEAN DEFAULT TRUE,
  verifiedAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customerId) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_customer_whatsapp (customerId)
);

-- Create Business WhatsApp Contact table (for company)
CREATE TABLE IF NOT EXISTS business_contacts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  contactType VARCHAR(50) NOT NULL COMMENT 'whatsapp, email, phone',
  value VARCHAR(255) NOT NULL,
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_contact_type (contactType)
);

-- Alter customers table to add feedback-related fields
ALTER TABLE customers ADD COLUMN IF NOT EXISTS feedbackOptIn BOOLEAN DEFAULT TRUE;
