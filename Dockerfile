FROM node:20-alpine

WORKDIR /app

ENV PORT=80

COPY . /app

EXPOSE 80

CMD ["node", "-e", "const http=require('http');const port=process.env.PORT||80;http.createServer((req,res)=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end('<h1>Recuerdame</h1><p>CloudBase container is running. Preview and publish the mini program with WeChat Developer Tools.</p>')}).listen(port,'0.0.0.0',()=>console.log('CloudBase container is running on port '+port));"]
