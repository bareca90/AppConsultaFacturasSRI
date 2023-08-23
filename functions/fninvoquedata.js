//const logger = require('../utils/logger');
const {consultarDatos}  =    require('../database/callstoreprocedure');

const  readjsonbd   =   async(ruc,password,datosjson)    =>  {
    /* 
    *   Leo los datos que son enviados en el json para desestructurarlo
    */
    for(const claveacceso of datosjson){
        /**Por cada clav de acceso se lee,consulta,descarga y genera el pdf */
        console.log(ruc);
        console.log(password);
        console.log(claveacceso.codmsg)
        console.log(claveacceso.descripcionmsg)
        console.log(claveacceso.tipoDocumento)
        console.log(claveacceso.nroDocumento)
        console.log(claveacceso.rucEmisor)
        console.log(claveacceso.razonSocial)
        console.log(claveacceso.fechaEmision)
        console.log(claveacceso.claveAcceso)
    }
}

module.exports={
    readjsonbd
}