import chalk from 'chalk';
import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";

const app = express();
app.use(cors());
app.use(express.json());
dotenv.config();
const porta = process.env.PORTA || 5000;
const banco = process.env.BANCO;

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
	db = mongoClient.db(process.env.BANCO);
    console.log(`Conectado ao MongoDB no Database ${chalk.blue(banco)}`);
});
mongoClient.connect().catch((e) => {
    console.log(`Erro ao tentar conexão com o MongoDB`);
    console.log(e);
});

app.listen(porta,()=>{
    console.log(`Servidor aberto na porta ${chalk.blue(porta)}`)
});