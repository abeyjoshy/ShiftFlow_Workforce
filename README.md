# ShiftFlow Workforce

ShiftFlow is a cloud-based workforce management system built to help organizations manage employees, schedules, shift swaps, notifications, monitoring, and time-off workflows. The application uses a modern full-stack architecture with a React + TypeScript frontend and a Node.js/Express backend deployed on AWS using a serverless model. 

## Overview

ShiftFlow is designed as a scalable workforce platform for handling day-to-day staff coordination. The frontend is built with React and TypeScript, while the backend is implemented with Express and TypeScript, exposed through a unified `/api` layer. The project is deployed to AWS, with the backend running through Serverless on AWS Lambda and the frontend deployed to Amazon S3. 

## Architecture

### Frontend
- React
- TypeScript
- React Router
- Axios

### Backend
- Node.js
- Express
- TypeScript
- Mongoose
- JWT authentication
- bcrypt password hashing

### Cloud & Deployment
- AWS Lambda
- AWS HTTP API / API Gateway
- Amazon S3
- GitHub Actions CI/CD
- Serverless Framework

### Database
- MongoDB Atlas