import chalk from 'chalk';
import express from 'express';
import cors from 'cors';
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import joi from 'joi';
import dayjs from 'dayjs';

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

app.post('/participants', async (req,res) => {
    const participante = req.body;
    const participanteSchema = joi.object({name: joi.string().required()});
    const {error} = participanteSchema.validate(participante)
    if(error){
        return res.status(422).send("Nome deve ser uma string não vazia");
    }
    try {
        const nomeRepetido = await db.collection("participantes").findOne({name: participante.name});
        if(nomeRepetido){
            return res.status(409).send("Esse nome já está sendo utilizado");
        }
        await db.collection("participantes").insertOne({name: participante.name, lastStatus: Date.now()});
        await db.collection("mensagens").insertOne({
            from: participante.name, 
            to: 'Todos', 
            text: 'entra na sala...', 
            type: 'status', 
            time: dayjs().format('HH:mm:ss')
        });
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
    }
});

app.get('/participants', async (req,res) => {
    try {
      const participantes = await db.collection('participantes').find().toArray();
      res.send(participantes);
    } catch (error) {
      console.error({ error });
    }
});

app.post('/messages', async (req,res)=>{
    const mensagem = req.body;
    const remetente = req.headers.user;
    const mensagemSchema = joi.object({
        to: joi.string().required(),
        text: joi.string().required(),
        type: joi.string().valid('message','private_message')
    });
    const {error} = mensagemSchema.validate(mensagem);
    if(error){
        return res.sendStatus(422);
    }
    try {
        const remetenteVerificado = await db.collection('participantes').findOne({name: remetente});
        if(!remetenteVerificado){
            return res.sendStatus(422);
        }
        await db.collection('mensagens').insertOne({
            from: remetente,
            to: mensagem.to,
            text: mensagem.text,
            type: mensagem.type,
            time: dayjs().format('HH:mm:ss')
        })
        res.sendStatus(201);
    } catch (error) {
        console.log(error);
    }
});

app.get('/messages', async (req,res)=>{
    const limite = parseInt(req.query.limit);
    const usuario = req.headers.user;
    try {
        const mensagens = await db.collection('mensagens').find().toArray();
        const mensagensFiltradas = mensagens.filter(mensagem=>{
            return mensagem.to === usuario || mensagem.from === usuario || mensagem.to === 'Todos' || mensagem.type === 'message'
        });
        if (limite && limite !== NaN) {
            return res.send(mensagensFiltradas.slice(-limite));
          }
        else{
            return res.send(mensagensFiltradas);
        }
    } catch (error) {
        console.log(error);
    }
});

app.post('/status', async (req,res)=>{
    const usuario = req.headers.user;
    try {
        const usuarioVerificado = await db.collection('participantes').findOne({name: usuario});
        if (!usuarioVerificado){
            return res.sendStatus(404);
        }
        await db.collection('participantes').updateOne({name:usuario},{$set: {lastStatus: Date.now()}});
        res.sendStatus(200);
    } catch (error) {
        console.log(error);
        
    }
});

setInterval(async ()=>{
    const tempoMenos10 = Date.now() - 10000;
    try {
        const participantes = await db.collection('participantes').find().toArray();
        const participantesInativos = participantes.filter(participante => participante.lastStatus <= tempoMenos10);
        await participantsCollection.deleteMany({ lastStatus: { $lte: tempoMenos10 } }); //$lte is a operator from MongoDB and it means less than or equal 
    } catch (error) {
        console.log(error);
    }
}, 15000);

app.listen(porta,()=>{
    console.log(`Servidor aberto na porta ${chalk.blue(porta)}`)
});