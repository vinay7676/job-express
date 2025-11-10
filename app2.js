import express from 'express';
const app = express();
const PORT = process.env.PORT || 4000;

app.get('/', (req, res) => {
  res.send('Hello from app2!');
});
app.listen(PORT, () => {
  console.log(`App2 is running on port ${PORT}`);
});
export default app;
