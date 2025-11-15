require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer'); // Resume upload
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// MongoDB setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rs9y1es.mongodb.net/?appName=CareerConnect`;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
    try {
        await client.connect();
        console.log("✅ MongoDB Connected!");

        const db = client.db("careerConnect");
        const usersCollection = db.collection("users");
        const jobsCollection = db.collection("appliedJobs");
        const resumesCollection = db.collection("resumes");

        // Test route
        app.get('/', (req, res) => {
            res.send('Career Connect Portal is ready');
        });

        /** ---------------- USERS ROUTES ---------------- **/

        // Get all users
        app.get('/api/users', async (req, res) => {
            try {
                const users = await usersCollection.find().toArray();
                res.json(users);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });

        // Update user role to admin
        app.patch('/api/users/admin/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: 'admin' } }
                );
                res.json(result);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });

        // Delete a user
        app.delete('/api/users/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
                res.json(result);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });

        /** ---------------- APPLIED JOBS ROUTES ---------------- **/

        // Get applied jobs for user or all jobs
        app.get('/api/applied-jobs', async (req, res) => {
            try {
                const { userId } = req.query;
                const query = userId ? { userId } : {};
                const jobs = await jobsCollection.find(query).toArray();
                res.json(jobs);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });

        // Add new applied job
        app.post('/api/applied-jobs', async (req, res) => {
            try {
                const job = req.body; // { userId, title, company, status }
                const result = await jobsCollection.insertOne(job);
                res.json(result);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });

        // Delete applied job
        app.delete('/api/applied-jobs/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
                res.json(result);
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });

        /** ---------------- RESUME UPLOAD ---------------- **/

        app.post('/api/upload-resume', upload.single('resume'), async (req, res) => {
            try {
                if (!req.file) return res.status(400).json({ message: "No file uploaded" });

                const resumeData = {
                    userId: req.body.userId,
                    filename: req.file.filename,
                    path: req.file.path,
                    uploadedAt: new Date()
                };
                await resumesCollection.insertOne(resumeData);

                res.json({ message: "Resume uploaded successfully", file: resumeData });
            } catch (err) {
                res.status(500).json({ message: err.message });
            }
        });

        app.listen(port, () => {
            console.log(`🚀 Server running on port ${port}`);
        });

    } catch (err) {
        console.error(err);
    }
}

run();
