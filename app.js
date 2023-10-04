const sql               =   require('mssql/msnodesqlv8');
const cron              =   require('node-cron');
const config            =   require('./config/config');
const {processRecords}  =   require('./helpers/executeprocess');

//--------------------------------------------
//Validacion que se COnecte a la BD
//--------------------------------------------
const mensaje = async()=>{
    try{
        const respuesta = await sql.connect(config)
        if (respuesta) console.log('Se Conecto a la Base Correctamente')
        return true ;
    }catch(error){
        console.log(error)
        return false ;
    }
}
const main = async () => {
    //--------------------------------------------
    //Validación Base de Datos
    //--------------------------------------------
    const val_conexion = await mensaje();
    if (val_conexion){
        //--------------------------------------------
        //Ejecución de el Cron de Consulta
        //--------------------------------------------
        try {
            //const msg   = await processRecords();
            //console.log('Ingreso por el dato correcto');
            cron.schedule('* * * * *', processRecords);
            //console.log(msg);
        } catch (error) {
            console.error('Error al Ejecutar Procesos:', error);
        }
        
    }else{
        console.log('Revise configuracion de BD');
    }

};

main();