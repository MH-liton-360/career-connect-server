require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer Storage Setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = 'uploads/';
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueName + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// MongoDB Setup
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rs9y1es.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

async function run() {
    try {
        await client.connect();
        console.log("✅ MongoDB Connected!");

        const db = client.db("careerConnect");
        const usersCollection = db.collection("users");
        const appliedJobsCollection = db.collection("appliedJobs");
        const resumesCollection = db.collection("resumes");
        const jobsCollection = db.collection("jobs");

        // Root route
        app.get('/', (req, res) => {
            res.send("Career Connect Server is Running...");
        });



        // Fetch All Users
        app.get('/api/users', async (req, res) => {
            try {
                const users = await usersCollection.find().toArray();
                res.send(users);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Make a user Admin
        app.patch('/api/users/admin/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { role: "admin" } }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Update user description
        app.patch('/api/users/description/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { description } = req.body;
                const result = await usersCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: { description } }
                );
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Delete User
        app.delete('/api/users/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });



        // Get jobs (all or filter by userId)
        app.get('/api/applied-jobs', async (req, res) => {
            try {
                const { userId } = req.query;
                const query = userId ? { userId } : {};
                const jobs = await appliedJobsCollection.find(query).toArray();
                res.send(jobs);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Add Applied Job
        app.post('/api/applied-jobs', async (req, res) => {
            try {
                const newJob = req.body;
                const result = await appliedJobsCollection.insertOne(newJob);
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Delete applied job
        app.delete('/api/applied-jobs/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await appliedJobsCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });




        // Upload resume
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

                res.send({
                    message: "Resume uploaded successfully",
                    file: resumeData
                });
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Get resumes by user
        app.get('/api/resumes', async (req, res) => {
            try {
                const { userId } = req.query;
                if (!userId) return res.status(400).json({ message: "userId is required" });

                const resumes = await resumesCollection.find({ userId }).toArray();
                res.send(resumes);
            } catch (error) {
                res.status(500).json({ message: error.message });
            }
        });



        // Add Job
        app.post('/api/jobs', async (req, res) => {
            try {
                const job = req.body;
                const result = await jobsCollection.insertOne(job);
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Get Jobs
        app.get('/api/jobs', async (req, res) => {
            try {
                const jobs = await jobsCollection.find().toArray();
                res.send(jobs);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });

        // Delete Job
        app.delete('/api/jobs/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });
                res.send(result);
            } catch (error) {
                res.status(500).send({ error: error.message });
            }
        });


        app.listen(port, () => {
            console.log(`🚀 Server running on port ${port}`);
        });

    } catch (error) {
        console.error(error);
    }
}

run();
