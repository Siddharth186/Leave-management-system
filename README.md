# 🎓 Student Leave Management Portal

A production-ready **MERN stack** web application for managing student leave requests with role-based access control, real-time notifications, and comprehensive dashboard analytics.

---

## 🚀 **Features**

### For Students
- ✅ Apply for leave (casual, medical, emergency)
- 📋 View leave history with filters
- 📊 Dashboard with leave balance and statistics
- 🔔 Real-time notifications for leave status updates
- 👤 Profile management

### For Admins/Faculty
- ✅ Review and approve/reject pending leave requests
- 💬 Add rejection comments
- 📊 System-wide analytics dashboard
- 🔍 Filter leaves by status, type, and date
- 👥 Manage all student requests

---

## 🛠️ **Tech Stack**

### Backend
- **Node.js** + **Express.js** — REST API framework
- **MongoDB** + **Mongoose** — NoSQL database with ODM
- **JWT** — Stateless authentication
- **bcryptjs** — Password hashing
- **express-validator** — Request validation
- **CORS** — Cross-origin requests
- **dotenv** — Environment configuration

### Frontend
- **React 19** — UI library
- **React Router** — Client-side routing
- **Axios** — HTTP client with interceptors
- **Recharts** — Data visualization
- **TailwindCSS 4** — Utility-first styling
- **Lucide React** — Icon system
- **Vite** — Build tool with HMR

---

## 📁 **Project Structure**

```
leave-management-system/
│
├── backend/                     # Express.js REST API
│   ├── config/
│   │   └── db.js                # MongoDB connection
│   ├── models/
│   │   ├── User.js              # User schema (students + admins)
│   │   ├── Leave.js             # Leave request schema
│   │   └── Notification.js      # Notification schema (TTL index)
│   ├── controllers/
│   │   ├── authController.js    # Register, login, profile
│   │   ├── leaveController.js   # Apply, history, approve, reject
│   │   ├── dashboardController.js # Metrics, charts
│   │   └── notificationController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── leaveRoutes.js
│   │   ├── dashboardRoutes.js
│   │   └── notificationRoutes.js
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT protection
│   │   ├── roleMiddleware.js    # RBAC (restrict admin routes)
│   │   ├── errorMiddleware.js   # Global error handler
│   │   └── validationMiddleware.js # express-validator chains
│   ├── utils/
│   │   ├── generateToken.js     # JWT signing + verification
│   │   └── calculateLeaveDays.js # Date math, balance logic
│   ├── server.js                # Entry point
│   ├── seed.js                  # Demo account creator
│   ├── package.json
│   └── .env
│
├── client/                      # React SPA
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Common/
│   │   │   │   ├── Layout.jsx
│   │   │   │   ├── Navbar.jsx   # Bell icon + notification dropdown
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── StatusBadge.jsx
│   │   │   │   ├── ConfirmationModal.jsx
│   │   │   │   └── ...
│   │   │   └── Leaves/
│   │   │       ├── LeaveForm.jsx
│   │   │       ├── LeaveTable.jsx
│   │   │       └── MetricCard.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # User state + token validation
│   │   │   └── LeaveContext.jsx # Leave data + CRUD actions
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useLeaves.js
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx    # Role-specific metrics
│   │   │   ├── ApplyLeave.jsx
│   │   │   ├── LeaveHistory.jsx
│   │   │   ├── ManagerApproval.jsx
│   │   │   └── Profile.jsx
│   │   ├── services/
│   │   │   └── api.js           # Axios instance + interceptors
│   │   ├── utils/
│   │   │   └── helpers.js
│   │   ├── App.jsx               # Router + protected routes
│   │   ├── main.jsx
│   │   └── index.css
│   ├── vite.config.js           # Dev server + proxy
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env
│
└── README.md                    # This file
```

---

## 🔧 **Setup Instructions**

### Prerequisites
- **Node.js** v16+ and **npm** v7+
- **MongoDB** — local instance or MongoDB Atlas cluster

### 1️⃣ Clone the repository
```bash
git clone <repo-url>
cd leave-management-system
```

### 2️⃣ Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment variables
# Edit backend/.env and set:
#   - MONGO_URI=mongodb://localhost:27017/leave-management
#   - JWT_SECRET=<generate a strong random string>
#   - PORT=5000
#   - CLIENT_URL=http://localhost:5173

# Seed demo accounts (requires MongoDB to be running)
npm run seed

# Start backend server
npm run dev    # Development (nodemon)
npm start      # Production
```

**Demo Accounts Created:**
- `student@test.com` / `password123` (role: student)
- `admin@test.com` / `password123` (role: admin)

### 3️⃣ Frontend Setup

```bash
cd client

# Install dependencies
npm install

# Configure environment (already set in .env)
# VITE_API_URL=http://localhost:5000/api

# Start frontend dev server
npm run dev
```

### 4️⃣ Access the Application
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000 (returns JSON with API status)

---

## 🔑 **API Endpoints**

### Authentication
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/auth/register` | Public | Register new user |
| `POST` | `/api/auth/login` | Public | Login + receive JWT |
| `GET` | `/api/auth/profile` | Private | Get current user profile |
| `PUT` | `/api/auth/profile` | Private | Update profile |

### Leaves
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `POST` | `/api/leaves/apply` | Student | Submit leave request |
| `GET` | `/api/leaves/history` | Student | View own leave history |
| `GET` | `/api/leaves/pending` | Admin | View all pending requests |
| `PUT` | `/api/leaves/approve/:id` | Admin | Approve leave |
| `PUT` | `/api/leaves/reject/:id` | Admin | Reject leave + comment |
| `GET` | `/api/leaves/:id` | Both | Get single leave (ownership check) |

### Dashboard
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/dashboard/metrics` | Private | Role-specific metrics |
| `GET` | `/api/dashboard/chart` | Private | Chart data (type distribution, trends) |
| `GET` | `/api/dashboard/activities` | Private | Recent leave actions |

### Notifications
| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/notifications` | Private | Paginated notifications + unread count |
| `PUT` | `/api/notifications/read/:id` | Private | Mark single as read |
| `PUT` | `/api/notifications/read-all` | Private | Mark all as read |
| `DELETE` | `/api/notifications/:id` | Private | Delete notification |

---

## 🔒 **Security Features**

- ✅ **Password hashing** — bcrypt with cost factor 12
- ✅ **JWT authentication** — 7-day expiry, role embedded in token
- ✅ **Role-based access control** — `restrictTo()` middleware
- ✅ **Input validation** — express-validator with custom business rules
- ✅ **Ownership checks** — students can only access their own resources
- ✅ **CORS** — only `CLIENT_URL` origin allowed
- ✅ **Error sanitization** — stack traces only in development
- ✅ **Token validation on mount** — AuthContext verifies stored token via `/profile` call
- ✅ **Global 401 handler** — Axios interceptor auto-redirects expired sessions to login

---

## 📊 **Database Schema**

### User Collection
```javascript
{
  name:       String,
  email:      String (unique, indexed),
  password:   String (hashed, select: false),
  role:       'student' | 'admin',
  studentId:  String,
  department: String,
  year:       Number (1-5),
  leaveBalance: {
    casual:    Number (default: 12),
    medical:   Number (default: 6),
    emergency: Number (default: 3)
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Leave Collection
```javascript
{
  studentId:        ObjectId (ref User, indexed),
  leaveType:        'casual' | 'medical' | 'emergency',
  startDate:        Date,
  endDate:          Date,
  reason:           String (min 10 chars),
  duration:         Number (auto-calculated),
  status:           'pending' | 'approved' | 'rejected' (indexed),
  rejectionComment: String,
  reviewedBy:       ObjectId (ref User),
  reviewedAt:       Date,
  createdAt:        Date,
  updatedAt:        Date
}
```
**Indexes:** `(studentId, status)`, `(status, createdAt)`

### Notification Collection
```javascript
{
  userId:          ObjectId (ref User, indexed),
  title:           String,
  message:         String,
  type:            'leave_submitted' | 'leave_approved' | 'leave_rejected' | 'system',
  read:            Boolean (default: false, indexed),
  relatedLeaveId:  ObjectId (ref Leave),
  createdAt:       Date (TTL index: auto-delete after 30 days)
}
```
**TTL Index:** `createdAt` expires after 30 days

---

## 🎨 **UI/UX Highlights**

- 🌙 **Dark theme** with cyan accents
- 🔔 **Real-time notification bell** badge + dropdown
- 📱 **Fully responsive** — mobile, tablet, desktop
- ⚡ **Loading states** — spinners, skeletons, disabled buttons
- 🔄 **Optimistic UI** — instant feedback before server confirms
- 🎯 **Role-aware navigation** — students see Apply Leave/History, admins see Approvals
- 📊 **Interactive charts** — Recharts bar charts on Dashboard
- 🔐 **Auth redirects** — logged-in users can't access `/login`, logged-out users redirect to `/login`

---

## 🧪 **Testing the Flow**

### Student Flow
1. Register at `/register` with role=student
2. Login → redirected to `/dashboard`
3. Click **Apply Leave** → fill form → submit
4. View **Leave History** — see status "Pending"
5. Bell icon shows `1` unread notification
6. Wait for admin to approve → notification updates

### Admin Flow
1. Login with `admin@test.com / password123`
2. Dashboard shows **Total Students** card + pending count
3. Click **Approvals** in nav → see all pending requests
4. Click ✅ Approve or ❌ Reject (requires comment)
5. Student receives notification immediately

---

## 🐛 **Common Issues**

### Backend won't start
- ✅ Check MongoDB is running (`mongod` command or MongoDB Compass)
- ✅ Verify `MONGO_URI` in `backend/.env` is correct
- ✅ Run `npm install` in `backend/` folder

### Frontend can't connect to backend
- ✅ Ensure backend is running on port 5000
- ✅ Check `VITE_API_URL` in `client/.env` is `http://localhost:5000/api`
- ✅ Verify `vite.config.js` proxy is configured

### 401 Unauthorized on every request
- ✅ Check JWT_SECRET in `backend/.env` matches between runs
- ✅ Clear browser localStorage (`localStorage.clear()` in DevTools console)
- ✅ Re-login to get fresh token

### Notifications not appearing
- ✅ Verify leave was created successfully (check MongoDB or leave history)
- ✅ Check Navbar component is fetching from `/api/notifications`
- ✅ Inspect Network tab — `/api/notifications` should return `200` with `unreadCount`

---

## 📦 **Production Deployment**

### Backend (Railway, Render, AWS)
1. Set environment variables in hosting platform:
   ```
   MONGO_URI=<MongoDB Atlas connection string>
   JWT_SECRET=<strong random string>
   CLIENT_URL=<frontend production URL>
   PORT=5000
   NODE_ENV=production
   ```
2. Build command: `npm install`
3. Start command: `npm start`

### Frontend (Vercel, Netlify)
1. Set build environment variable:
   ```
   VITE_API_URL=<backend production URL>/api
   ```
2. Build command: `npm run build`
3. Output directory: `dist`
4. **Important:** Add rewrite rule for SPA routing:
   - Netlify: create `public/_redirects` with `/*  /index.html  200`
   - Vercel: add `vercel.json` with rewrites config

---

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'Add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Open a Pull Request

---

## 📄 **License**

This project is licensed under the MIT License.

---

## 👨‍💻 **Author**

Built with ❤️ using the MERN stack + modern best practices.

**Questions?** Open an issue or reach out!

---

## 🎯 **Roadmap**

- [ ] Email notifications (Nodemailer + SendGrid)
- [ ] File upload for medical certificates (Multer + AWS S3)
- [ ] Calendar view for leave visualization
- [ ] Export leave history as PDF
- [ ] Rate limiting (express-rate-limit)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit + integration tests (Jest + Supertest)
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
