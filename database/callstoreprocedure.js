const sql       =   require('mssql/msnodesqlv8');
const config    =   require('../config/config');
/*
------------------------
Invocacion Store Procedure para consultas de Datos
------------------------
*/
const consultarDatos = async(opcion,query) => {
    try{
        let pool = await sql.connect(config);
        let datosJson = await pool.request()
            .input('opcion', sql.Char, opcion)
            .execute(query);
        return datosJson.recordsets[0];
        
    }catch(error){
        console.log(error);
    }
};
/*
------------------------
Actualizar estado de Pdf Generado y de Ruta  guardada
------------------------
*/
let actualizarutaspdf = async(query,opcion,claveacceso,valor) => {
    try {
        let pool = await sql.connect(config);
        let datospdfact = await pool.request()
            .input('opcion', sql.Char, opcion)
            .input('claveacceso', sql.Char, claveacceso)
            .input('valor', sql.Char, valor)
            .execute(query);
        /* console.log(clientes); */
        return datospdfact.recordsets;
        /* return clientes; */
    } catch (error) {
        console.log(error);
    }
}

module.exports={
    consultarDatos,
    actualizarutaspdf
}