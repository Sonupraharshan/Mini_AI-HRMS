# Mini AI-HRMS

Welcome to the Mini AI-HRMS project! This is a full-stack monorepo containing the frontend, backend, and smart contracts for the AI-powered Human Resource Management System.

## Project Structure

This repository is organized as a monorepo with the following main directories:

- **`/frontend`**: Contains the React + Vite frontend application.
  - Built with React, Tailwind CSS, and Vite.
  - To run: `cd frontend` and `npm run dev`
- **`/backend`**: Contains the Node.js + Express backend API and database connection.
  - Built with Express and Prisma (PostgreSQL).
  - To run: `cd backend` and `npm run dev`
- **`/contracts`**: Contains the Ethereum Smart Contracts and Hardhat setup.
  - Built with Hardhat and Solidity.

## Getting Started

1. Clone the repository.
2. Open three separate terminal windows.
3. In each terminal, navigate to the respective directory (`frontend`, `backend`, `contracts`).
4. Run `npm install` in each directory to install the dependencies.
5. Setup the environment variables (`.env`) for the backend.
6. Start the development servers as described above.

## Note on Configuration Files

Each module (`frontend`, `backend`, `contracts`) has its own configuration files (like `package.json`, `vite.config.js`, `tailwind.config.js`, etc.). This is intentional! It ensures that the dependencies and build tools for each part of the stack are kept completely separate and don't clash with one another.
