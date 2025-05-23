const express = require("express");
const student = express.Router();
const expressAsyncHandler = require("express-async-handler");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require('path');
const fs = require('fs');

// Use json middleware
student.use(express.json());

student.post("/create_user", expressAsyncHandler(async (req, res) => {
  try {
    let studentsCollection = req.app.get("studentCollection");
    let newUserObj = req.body;
    
    // Check if username already exists
    let userDB = await studentsCollection.findOne({ username: newUserObj.username });
    if (userDB != null) {
      res.send({ message: "Username has already been taken" });
    } else {
      // Hash password
      let hashedPassword = await bcryptjs.hash(newUserObj.password, 10);
      newUserObj.password = hashedPassword;

      // Attach the profile photo filename
      if (req.file) {
        newUserObj.profilePhoto = req.file.filename;
      }

      // Insert newUser
      await studentsCollection.insertOne(newUserObj);
      const userId = newUserObj.username; // Get the ID of the inserted user
      res.send({ message: "New user created", userId: userId });
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).send({ message: "Internal Server Error" });
  }
}));

// Create route for user login
student.post("/login", expressAsyncHandler(async (request, response) => {
  let studentsCollection = request.app.get("studentCollection");
  // Get user credentials object from client
  let userCredObj = request.body;
  // Search for user by username
  let userDB = await studentsCollection.findOne({ username: userCredObj.username });
  // If username does not exist
  if (userDB == null) {
    response.send({ message: "Invalid user" });
  } else {
    // Compare passwords
    let status = await bcryptjs.compare(userCredObj.password, userDB.password);
    if (status == false) {
      response.send({ message: "Invalid password" });
    } else {
      // Create token
      let token = jwt.sign({ username: userDB.username }, 'abcdef', { expiresIn: 600 });
      // Send token
      response.send({ message: "Login success", payload: token, userObj: userDB });
    }
  }
}));

student.get("/get_user/:clg_name", expressAsyncHandler(async (request, response) => {
  let studentsCollection = request.app.get("studentCollection");
  let college_name = request.params.clg_name;
  let filtered_users = await studentsCollection.find({ college: "VNR VJIET" }).toArray();
  response.send({ message: "Created user successfully", payload: filtered_users });
  console.log(filtered_users);
}));

student.get("/get_userdetails/:id", expressAsyncHandler(async (request, response) => {
  let studentsCollection = request.app.get("studentCollection");
  let userId = request.params.id;
  let user = await studentsCollection.findOne({ username: userId });
  if (user) {
    response.send(user);
  } else {
    response.status(404).send({ message: "User not found" });
  }
}));

// Update details
student.put("/update_user/:id", expressAsyncHandler(async (request, response) => {
  let studentsCollection = request.app.get("studentCollection");
  let userId = request.params.id; // This should be the username or unique identifier
  let details = request.body; // The details to be updated should be sent in the request body

  try {
      // Construct the update object
      let updateObj = {};
      for (const key in details) {
          if (details.hasOwnProperty(key) && key !== 'username') {
              updateObj[key] = details[key];
          }
      }
      console.log("updateobj=",updateObj);

      try{
          // Hash password
          let hashedPassword = await bcryptjs.hash(updateObj.password, 10);
          updateObj.password = hashedPassword;
          }
          catch(error){
              console.error('Error hashing password:', error);
              return res.status(500).send({ message: "Error hashing password" });
          }

      // Perform the update
      let result = await studentsCollection.updateOne({ username: userId }, { $set: updateObj });

      if (result.modifiedCount > 0) {
          response.send({ message: "User details updated successfully" });
      } else {
          response.status(404).send({ message: "User not found or no changes made" });
      }
  } catch (error) {
      console.error('Error updating user details:', error);
      response.status(500).send({ message: "Internal Server Error" });
  }
}));


module.exports = student;
