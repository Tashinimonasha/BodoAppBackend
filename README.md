# BODO APP - Backend

## Project Overview
BODO APP is a web and mobile application designed to help users find nearby boarding accommodations efficiently. This backend, built with **Node.js**, **Express.js**, and **Firebase**, handles user authentication, data management, and API requests for the frontend applications.

## Features
- User authentication (JWT-based authentication & Firebase authentication)
- Firebase Firestore database integration
- API routes for managing users, reviews, and boarding listings
- Middleware for protected routes
- Firebase Storage for image and file uploads

---

## Technologies Used
- **Node.js**
- **Express.js**
- **Firebase Firestore** (Database)
- **Firebase Storage** (File Storage)
- **JWT Authentication**
- **Dotenv** (Environment Variables Management)

---

## Project Structure
```
BODOAPPBACKEND/
│── config/
│   ├── firebaseConfig.js
│── controllers/
│   ├── authController.js
│   ├── userController.js
│── middlewares/
│   ├── authMiddleware.js
│── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── boardingRoutes.js
│   ├── reviewRoutes.js
│── .env
│── app.js
│── package.json
│── README.md
```

---

## Installation & Setup
### Prerequisites
Ensure you have **Node.js** and **Firebase CLI** installed on your system.

### Steps to Set Up the Backend
1. Clone the repository:
   ```sh
   git clone https://github.com/your-repo/bodoapp-backend.git
   ```
2. Navigate to the project directory:
   ```sh
   cd bodoapp-backend
   ```
3. Install dependencies:
   ```sh
   npm install
   ```
4. Set up the `.env` file (see Environment Variables section below).
5. Start the server:
   ```sh
   npm start
   ```

---

## API Routes

### Authentication Routes
| Method | Endpoint       | Description |
|--------|--------------|-------------|
| POST   | `/api/auth/login`  | User login |
| POST   | `/api/auth/register`  | User registration |

### User Routes
| Method | Endpoint      | Description |
|--------|--------------|-------------|
| GET    | `/api/user/profile` | Fetch user profile (Protected) |

### Boarding Routes
| Method | Endpoint       | Description |
|--------|--------------|-------------|
| GET    | `/api/boarding/` | Get all boarding listings |
| POST   | `/api/boarding/add` | Add new boarding (Protected) |

### Review Routes
| Method | Endpoint       | Description |
|--------|--------------|-------------|
| GET    | `/api/reviews/` | Get all reviews |
| POST   | `/api/reviews/add` | Add a review (Protected) |

---

## Environment Variables
Create a `.env` file in the root directory and add the following:
```env
PORT=5000
FIREBASE_ADMIN_SDK=bodo-app-xxxx-firebase-adminsdk-xxxxx.json
JWT_SECRET=your_jwt_secret
```

---

## Deployment
This backend can be deployed using **Firebase Functions**, **Heroku**, or **Vercel**.
Example Firebase deployment:
```sh
firebase deploy --only functions
```

---

## License
This project is licensed under the MIT License.

