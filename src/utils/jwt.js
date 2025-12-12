// src/utils/jwt.js
const jwt = require('jsonwebtoken');

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET, {
    expiresIn: '2h', // Token berlaku 7 hari
  });
};

module.exports = { generateToken };