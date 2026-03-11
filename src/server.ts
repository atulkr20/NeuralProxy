import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'NeuralProxy is running'});
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`NeuralProxy server running on port ${PORT}`);
});