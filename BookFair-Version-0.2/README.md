# BookFair - Version 0.2

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [Version History](#version-history)
- [License](#license)
- [Contact](#contact)

## Overview

BookFair is a web-based application designed to facilitate online book trading, selling, and discovery. This platform connects book enthusiasts, allowing them to buy, sell, and exchange books in a user-friendly digital environment.

### Purpose
- Create a centralized platform for book lovers
- Facilitate easy book trading and selling
- Provide a seamless user experience for book discovery
- Enable secure transactions between users

## Features

### Core Features
- **User Registration & Authentication**: Secure login and registration system
- **Book Catalog Management**: Add, edit, and manage book listings
- **Search & Filter**: Advanced search functionality with multiple filters
- **User Profiles**: Personalized user profiles with transaction history
- **Shopping Cart**: Easy-to-use cart system for multiple purchases
- **Order Management**: Track orders and transaction history
- **Admin Panel**: Administrative controls for platform management

### Version 0.2 Features
- Enhanced user interface
- Improved search functionality
- Mobile-responsive design
- Advanced filtering options
- User rating and review system

## Technologies Used

### Frontend
- **HTML5**: Structure and markup
- **CSS3**: Styling and responsive design
- **JavaScript**: Interactive functionality
- **Bootstrap**: CSS framework for responsive design

### Backend
- **[Specify backend technology - e.g., PHP, Node.js, Python]**
- **[Database - e.g., MySQL, MongoDB, PostgreSQL]**

### Additional Tools
- **[Version Control]**: Git
- **[Package Manager]**: [Specify if applicable]
- **[Framework]**: [Specify if applicable]

## Installation

### Prerequisites
- Web server (Apache/Nginx)
- [Database system - e.g., MySQL 5.7+]
- [Runtime environment - e.g., PHP 7.4+, Node.js 14+]

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone https://github.com/MSaini-Dev/BookFair.git
   cd BookFair/BookFair-Version-0.2
   ```

2. **Database Setup**
   ```sql
   -- Create database
   CREATE DATABASE bookfair_db;
   
   -- Import database schema
   -- [Provide specific commands for your database]
   ```

3. **Configuration**
   - Copy configuration files
   - Update database connection settings
   - Set up environment variables

4. **Dependencies Installation**
   ```bash
   # Add specific installation commands based on your stack
   # e.g., npm install, composer install, pip install -r requirements.txt
   ```

5. **Run the Application**
   ```bash
   # Add specific run commands
   # e.g., npm start, php artisan serve, python app.py
   ```

## Usage

### For Users

#### Registration
1. Navigate to the registration page
2. Fill in required information (username, email, password)
3. Verify email address (if applicable)
4. Complete profile setup

#### Adding Books
1. Log in to your account
2. Navigate to "Add Book" section
3. Fill in book details (title, author, description, price)
4. Upload book images
5. Submit for review/publication

#### Searching Books
1. Use the search bar on the homepage
2. Apply filters (category, price range, condition)
3. Browse results and view book details
4. Add books to cart or purchase directly

#### Making Purchases
1. Add desired books to cart
2. Review cart contents
3. Proceed to checkout
4. Enter payment and shipping information
5. Confirm and place order

### For Administrators

#### User Management
- View and manage user accounts
- Handle user reports and disputes
- Monitor user activity

#### Book Management
- Review and approve book listings
- Remove inappropriate content
- Manage book categories

#### System Management
- Monitor system performance
- Generate reports
- Manage site content

## Project Structure

```
BookFair-Version-0.2/
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   ├── bootstrap.min.css
│   │   └── responsive.css
│   ├── js/
│   │   ├── main.js
│   │   ├── jquery.min.js
│   │   └── bootstrap.min.js
│   └── images/
│       ├── logo.png
│       └── [other images]
├── includes/
│   ├── header.php
│   ├── footer.php
│   ├── navbar.php
│   └── config.php
├── pages/
│   ├── index.html/php
│   ├── login.html/php
│   ├── register.html/php
│   ├── dashboard.html/php
│   ├── books.html/php
│   └── profile.html/php
├── admin/
│   ├── admin_dashboard.php
│   ├── manage_users.php
│   └── manage_books.php
├── database/
│   ├── bookfair.sql
│   └── schema.sql
└── README.md
```

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
- **Description**: User login
- **Parameters**: 
  - `email` (string, required)
  - `password` (string, required)
- **Response**: Authentication token

#### POST /api/auth/register
- **Description**: User registration
- **Parameters**:
  - `username` (string, required)
  - `email` (string, required)
  - `password` (string, required)

### Book Management Endpoints

#### GET /api/books
- **Description**: Get all books with pagination
- **Parameters**:
  - `page` (integer, optional)
  - `limit` (integer, optional)
  - `category` (string, optional)

#### POST /api/books
- **Description**: Add new book (authenticated users only)
- **Parameters**:
  - `title` (string, required)
  - `author` (string, required)
  - `description` (text, optional)
  - `price` (decimal, required)

#### GET /api/books/:id
- **Description**: Get specific book details

#### PUT /api/books/:id
- **Description**: Update book (owner only)

#### DELETE /api/books/:id
- **Description**: Delete book (owner/admin only)

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(15),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    role ENUM('user', 'admin') DEFAULT 'user'
);
```

### Books Table
```sql
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    author VARCHAR(100) NOT NULL,
    isbn VARCHAR(13),
    description TEXT,
    category_id INT,
    condition ENUM('new', 'used', 'damaged') DEFAULT 'used',
    price DECIMAL(10,2) NOT NULL,
    seller_id INT NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);
```

### Orders Table
```sql
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    book_id INT NOT NULL,
    quantity INT DEFAULT 1,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shipping_address TEXT,
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
);
```

### Categories Table
```sql
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Screenshots

### Homepage
![Homepage Screenshot](screenshots/homepage.png)
*Clean and intuitive homepage design*

### Book Listing
![Book Listing Screenshot](screenshots/book-listing.png)
*Comprehensive book catalog with search and filters*

### User Dashboard
![Dashboard Screenshot](screenshots/dashboard.png)
*User-friendly dashboard for managing books and orders*

### Admin Panel
![Admin Panel Screenshot](screenshots/admin-panel.png)
*Comprehensive admin controls*

## Contributing

We welcome contributions to BookFair! Please follow these guidelines:

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

### Code Standards
- Follow consistent coding style
- Write clear commit messages
- Add comments for complex functionality
- Test your changes thoroughly

### Reporting Issues
- Use the GitHub issue tracker
- Provide detailed description of the problem
- Include steps to reproduce
- Specify your environment details

## Version History

### Version 0.2 (Current)
- **Release Date**: [Date]
- **New Features**:
  - Enhanced user interface with improved navigation
  - Mobile-responsive design implementation
  - Advanced search and filtering options
  - User rating and review system
  - Improved book image upload functionality
- **Bug Fixes**:
  - Fixed login authentication issues
  - Resolved mobile compatibility problems
  - Improved database query performance
- **Improvements**:
  - Better error handling
  - Enhanced security measures
  - Optimized loading times

### Version 0.1
- **Release Date**: [Date]
- **Features**:
  - Basic user registration and authentication
  - Simple book listing functionality
  - Basic search capabilities
  - Order management system
  - Admin panel foundation

## Future Roadmap

### Version 0.3 (Planned)
- Payment gateway integration
- Real-time chat system between buyers and sellers
- Book recommendation engine
- Mobile app development
- Advanced analytics dashboard

### Version 0.4 (Planned)
- Multi-language support
- Social media integration
- Advanced seller tools
- Bulk upload functionality
- API for third-party integrations

## Security Considerations

### Implemented Security Measures
- Password hashing using secure algorithms
- SQL injection prevention
- XSS protection
- CSRF token implementation
- Input validation and sanitization
- Secure session management

### Best Practices
- Regular security updates
- Database backup procedures
- Error logging and monitoring
- User data privacy protection

## Performance Optimization

### Current Optimizations
- Database query optimization
- Image compression and caching
- Minified CSS and JavaScript files
- CDN integration for static assets

### Recommended Improvements
- Implement Redis caching
- Database indexing optimization
- Server-side compression
- Progressive web app features

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contact

**Project Maintainer**: MSaini-Dev

- **GitHub**: [MSaini-Dev](https://github.com/MSaini-Dev)
- **Email**: [your-email@example.com]
- **Project Repository**: [https://github.com/MSaini-Dev/BookFair](https://github.com/MSaini-Dev/BookFair)

## Acknowledgments

- Thanks to all contributors who helped make this project possible
- Special thanks to the open-source community for the tools and libraries used
- Bootstrap team for the responsive framework
- [Any other acknowledgments specific to your project]

---

**Note**: This documentation is for BookFair Version 0.2. For the latest updates and information, please refer to the GitHub repository.
