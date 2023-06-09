const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const jwt = require('jsonwebtoken');
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config()


// midleware
app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: "unauthorization access" })
    }

    const token = authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: "unauthorization access" })
        }
        req.decoded = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cbzwi67.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const user = client.db('sportAcademies').collection('user');
        const allClass = client.db('sportAcademies').collection('allClass');
        const selectClass = client.db('sportAcademies').collection('selectClass');
        const feedback = client.db('sportAcademies').collection('feedback');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: "1h" })
            res.send({ token })
        })

        // user related api
        app.post('/user', async (req, res) => {
            const userData = req.body;
            const query = { email: userData.email };
            const existingUser = await user.findOne(query);
            if (existingUser) {
                return res.send({ message: "user already exist" })
            }
            const result = await user.insertOne(userData);
            res.send(result);
        })

        app.get('/user', async (req, res) => {
            const result = await user.find().toArray();
            res.send(result);
        })
        // change user role in admin
        app.patch('/user/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            }
            const result = await user.updateOne(filter, updateDoc);
            res.send(result);
        })

        // change user role in instructor
        app.patch('/user/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'Instructor'
                },
            }
            const result = await user.updateOne(filter, updateDoc);
            res.send(result);
        })

        // change status of classes approved
        app.patch('/status/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'Approved'
                },
            }
            const result = await allClass.updateOne(filter, updateDoc);
            res.send(result);
        })

        // change status of classes deny
        app.patch('/status/deny/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    status: 'denied'
                },
            }
            const result = await allClass.updateOne(filter, updateDoc);
            res.send(result);
        })

        // feedback api
        app.post('/feedback', async (req, res) => {
            const feedBack = req.body;
            const result = await feedback.insertOne(feedBack)
            res.send(result)
        })

        app.get('/feedback', async (req, res) => {
            const result = await feedback.find().toArray();
            res.send(result)
        })

        app.delete('/user/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await user.deleteOne(query);
            res.send(result);
        })


        // all seleted class api
        app.post('/selectclass', async (req, res) => {
            const addClass = req.body;
            console.log(addClass);
            const result = await selectClass.insertOne(addClass);
            res.send(result);
        })
        // all classes get api
        app.get('/selectclass', verifyJWT, async (req, res) => {
            const email = req.query?.email;
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const result = await selectClass.find(query).toArray();
            res.send(result);
        })

        app.delete('/selectclass/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id)
            const query = { _id: new ObjectId(id) }
            const result = await selectClass.deleteOne(query);
            res.send(result);
        })

        app.post('/allclass', async (req, res) => {
            const classData = req.body;
            const result = await allClass.insertOne(classData);
            res.send(result);
        })

        // update class
        app.put('/allclass/:id', async (req, res) => {
            let id = req.params.id;
            console.log(id)
            let classData = req.body;
            let filter = { _id: new ObjectId(id) }
            const updateClass = {
                $set: {
                    className: classData.className,
                    availableSet: classData.availableSet,
                    price: classData.price,
                    classPhoto: classData.classPhoto
                }
            }
            const result = await allClass.updateOne(filter, updateClass);
            res.send(result);
        })

        app.get('/allclass', async (req, res) => {
            const result = await allClass.find().sort({ enrolledStudents: -1 }).toArray();
            res.send(result);

        })

        // my added class
        // app.get('/allclass', async (req, res) => {
        //     console.log(req.query)
        //     const filter = {}
        //     if (req.query?.email) {
        //         filter = { instructorEmail: req.query.email }
        //     };

        //     const result = await allClass.find(filter).toArray();
        //     res.send(result);
        // })

        app.get('/myclass', async (req, res) => {
            console.log(req.query.instructorEmail)
            let query = {};
            if (req.query?.instructorEmail) {
                query = { instructorEmail: req.query.instructorEmail }
            }
            const result = await allClass.find(query).toArray();
            res.send(result);
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running now')
})


app.listen(port, () => {
    console.log(`server is running now on port ${port}`)
})