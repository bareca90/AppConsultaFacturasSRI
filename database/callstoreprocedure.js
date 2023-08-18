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


module.exports={
    consultarDatos
}