import express from 'express';
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import multer from 'multer';
import QRCode from 'qrcode';
import User from '../models/User.mjs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../A.env') });

const router = express.Router();

// Use in-memory storage for multer
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

// Middleware to get user by ID and conditionally check scan time
const getUser = async (req, res, next) => {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            console.log("Invalid user ID format:", userId);
            return res.status(400).json({ message: "Invalid user ID format" });
        }

        const user = await User.findOne({ id: userId });
        if (!user) {
            console.log("User not found with ID:", userId);
            return res.status(404).json({ message: "Cannot find user" });
        }

        console.log("Found user:", user);
        req.user = user;
        next();
    } catch (error) {
        console.log("Error getting user:", error.message);
        res.status(500).json({ message: error.message });
    }
};

// Middleware to check scan time for specific routes (like GET by ID)
const checkScanTime = (req, res, next) => {
    const user = req.user;

    // Check if the user has scanned within the last 24 hours
    const currentTime = new Date();
    if (user.lastScanTime) {
        const timeDifference = currentTime - user.lastScanTime;
        const oneDay = 24 * 60 * 60 * 1000;

        if (timeDifference < oneDay) {
            console.log("User scanned within the last 24 hours:", timeDifference);
            return res.status(400).json({ message: "You can only scan once per day. Please come back tomorrow." });
        }
    }
    next();
};

// Get user by ID and update lastScanTime
router.get("/:id", getUser, checkScanTime, async (req, res) => {
    try {
        req.user.lastScanTime = new Date(); // Update lastScanTime to current time
        await req.user.save();
        console.log("Updated scan time for user:", req.user.id);
        res.json(req.user);
    } catch (error) {
        console.log("Error updating scan time:", error.message);
        res.status(500).json({ message: "Error updating scan time.", error });
    }
});

// Add a new user with image upload
router.post("/", upload.single('image'), async (req, res) => {
    console.log("Incoming request to add a new user");
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    const { name, id, numberOfMaleMembers, numberOfFemaleMembers, specialCase } = req.body;
    const imageFile = req.file;

    if (!name || !id || !numberOfMaleMembers || !numberOfFemaleMembers || !specialCase || !imageFile) {
        console.log("Validation failed: Missing fields");
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const existingUser = await User.findOne({ id });
        if (existingUser) {
            console.log("User with ID already exists:", id);
            return res.status(400).json({ message: "User with this ID already exists" });
        }

        console.log("Generating QR code for ID:", id);
        const qrcodeData = await QRCode.toDataURL(id.toString());
        console.log("QR code generated successfully");

        console.log("Image buffer size:", imageFile.buffer.length);

        // Create new user with image data stored as Buffer
        const user = new User({
            name,
            id,
            numberOfMaleMembers,
            numberOfFemaleMembers,
            specialCase,
            qrcodeData,
            imageUrl: imageFile.buffer, // Store the image data directly in MongoDB as Buffer
            lastScanTime: null // Initialize lastScanTime as null
        });

        const newUser = await user.save();
        console.log("New user saved successfully:", newUser);
        res.status(201).json(newUser);
    } catch (error) {
        console.error("Error occurred while processing request:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// Bulk add users with image paths in JSON
router.post("/bulk", async (req, res) => {
    console.log("Incoming bulk add request");
    const users = req.body;

    if (!Array.isArray(users)) {
        console.log("Invalid request body, must be an array");
        return res.status(400).json({ message: "Request body must be an array of users" });
    }

    const bulkOps = await Promise.all(users.map(async (user) => {
        const { name, id, numberOfMaleMembers, numberOfFemaleMembers, specialCase, imagePath } = user;

        const existingUser = await User.findOne({ id });
        if (existingUser) {
            console.log("User with ID already exists:", id);
            return { error: `User with ID ${id} already exists` };
        }

        console.log("Generating QR code for ID:", id);
        const qrcodeData = await QRCode.toDataURL(id.toString());

        console.log("Reading image from path:", imagePath);
        const imageBuffer = fs.readFileSync(path.resolve(imagePath));
        console.log("Image buffer size:", imageBuffer.length);

        const userDoc = new User({
            name,
            id,
            numberOfMaleMembers,
            numberOfFemaleMembers,
            specialCase,
            qrcodeData,
            imageUrl: imageBuffer, // Store image data directly in MongoDB
            lastScanTime: null // Initialize lastScanTime as null
        });

        return {
            insertOne: {
                document: userDoc
            }
        };
    }));

    try {
        const bulkWriteResult = await User.bulkWrite(bulkOps.filter(op => !op.error));
        const errors = bulkOps.filter(op => op.error);
        console.log("Bulk add completed with result:", bulkWriteResult);
        res.status(201).json({ bulkWriteResult, errors });
    } catch (error) {
        console.log("Error during bulk add:", error.message);
        res.status(400).json({ message: error.message });
    }
});

// Update user
router.put("/:id", getUser, async (req, res) => {
    const { name, id, numberOfMaleMembers, numberOfFemaleMembers, specialCase, imageData } = req.body;

    console.log("Updating user with ID:", req.user.id);

    if (name != null) req.user.name = name;
    if (id != null) {
        const existingUser = await User.findOne({ id });
        if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
            console.log("Another user with this ID already exists:", id);
            return res.status(400).json({ message: "User with this ID already exists" });
        }
        req.user.id = id;
        const qrcodeData = await QRCode.toDataURL(req.user.id.toString());
        req.user.qrcodeData = qrcodeData;
    }
    if (numberOfMaleMembers != null) req.user.numberOfMaleMembers = numberOfMaleMembers;
    if (numberOfFemaleMembers != null) req.user.numberOfFemaleMembers = numberOfFemaleMembers;
    if (specialCase != null) req.user.specialCase = specialCase;
    if (imageData != null) req.user.imageUrl = Buffer.from(imageData, 'base64'); // Convert base64 string to Buffer

    try {
        const updatedUser = await req.user.save();
        console.log("User updated successfully:", updatedUser);
        res.json(updatedUser);
    } catch (error) {
        console.log("Error updating user:", error.message);
        res.status(400).json({ message: "Can't update the user, please try again!" });
    }
});

// Delete user
router.delete("/:id", getUser, async (req, res) => {
    try {
        await req.user.deleteOne();
        console.log("User deleted successfully:", req.user.id);
        res.json({ message: "Deleted User" });
    } catch (error) {
        console.log("Error deleting user:", error.message);
        res.status(500).json({ message: "Can't delete the user file" });
    }
});

export default router;