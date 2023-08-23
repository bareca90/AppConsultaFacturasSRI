## Sistema de descarga de documentos electronicos
## Paso para poder iniciar el proyecto
-----------------------------
--Git
-----------------------------
git config --global user.name "bareca90"
git config --global user.email "bareca90@gmail.com"
git init 
git branch -m main
git add .
git commit -m "Creacion de Configuracion Inicial - Primer Commit "
git remote add origin https://github.com/bareca90/AppConsultaFacturasSRI.git
git push -u origin main
-----------------------------
--Configuración Proyecto
-----------------------------
npm init
npm install -g nodemon
npm i msnodesqlv8 --save
npm i mssql --save
npm i node-cron
npm i winston
npm install soap
npm i fast-xml-parser
