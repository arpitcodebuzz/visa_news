import express from 'express'
import dotenv from 'dotenv'
dotenv.config();
import cors from 'cors'
const app = express()
import AdminSwagger from '../src/common/config/admin.swagger.js'


import visaDataRoutes from '../src/aivisa/visadata.router'
import jobRoutes from '../src/jobbank/jobbank.router.js'
import newsData from '../src/newsdata/news.router.js'


app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }))


app.use('/documentation', AdminSwagger)

// app.use('/user-documentation',UserSwagger)
// app.use('/user-api',userRoutes)


app.use('/admin-api/visadata', visaDataRoutes) 
app.use('/admin-api/jobbank', jobRoutes)
app.use('/admin-api/newsData', newsData)

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});

// export default app