const {consultarDatos} = require('../database/callstoreprocedure');
/*
------------------------------
Permtiira que se Ejecuten los procesos(Recorrido de datos y generacion de cada pdf)
------------------------------
*/ 
const processRecords = async () =>  {
    try{
        /**
         * Aqui se va  a obtener los datos de la cuenta registrada del sri
         */
        let query      =    'SP_Consulta_Claves_Acceso';
        let parametro  =    'DAI';
        const   datoscredenciales   =   await consultarDatos(parametro,query);
        
        console.log('Datos Credenciales',datoscredenciales);
    }catch(error){
        console.error('Error al procesar los registros:', error);
    }
}
module.exports={
    processRecords
}