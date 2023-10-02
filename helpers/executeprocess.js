const   {consultarDatos} =    require('../database/callstoreprocedure');
const   {   readjsonbd      ,
            convertxmltopdf ,
            generaFacturaPdf,
            actualizarutaspdfbd
        }               =    require('../functions/fninvoquedata');
/*
------------------------------
Permtiira que se Ejecuten los procesos(Recorrido de datos y generacion de cada pdf)
------------------------------
*/ 
const processRecords = async () =>  {
    let msg         =   ''; 
    let parametro   =   '';
    try{
        /*
         * Aqui se va  a obtener los datos de la cuenta registrada del sri
        */
                query               =   'SP_Consulta_Claves_Acceso';
                parametro           =   'DAI'; //Datos Actuales de Ingreso 
        const   datoscredenciales   =   await consultarDatos(parametro,query);
        let     codmsg              =   datoscredenciales[0].codmsg;
        let     ruc                 =   datoscredenciales[0].ruc;
        let     password            =   datoscredenciales[0].password;
        let     pathdestino         =   datoscredenciales[0].url;
        
        
        /* 
        *   Aqui se procedera a obtener los datos de las claves de acceso cargadas en el sistema
        */
        if(codmsg==200){
            parametro                   =   'DCA'   //Datos de Clave de Acceso
            const   datosclavesaccesos  =   await consultarDatos(parametro,query);
            /* 
            *   Este dato que recibimos hay que procesarlo y para esto lo pasamos a las funciones , aqui se recibiran los xmls obtenidos
            */
            const   datosreadjson       =   await readjsonbd(ruc,password,pathdestino,datosclavesaccesos);   
            /*
            *   Luego de Obtener los datos se procede a generar los diferentes archivos pdf y guardarlos en la ruta
            */
            const   datospdfgenerados   =   await convertxmltopdf(datosreadjson,pathdestino);
            /*
            *   Genero los Archivos PDFque se obtienen de la conversion de xml
            */
            const   pdfgenerados        =   await generaFacturaPdf(datospdfgenerados,pathdestino);
            /** 
             *  Guardo las rutas en la bd
             *  ACT Actualiza Datos en la bd Sin errores en el pdf generado
            */
            const    rutasactualizadas   =   await actualizarutaspdfbd('ACT','Sp_Actualiza_Rutas',pdfgenerados)
            if(rutasactualizadas){
                console.log('Proceso Finalizado',pdfgenerados);
            }

            //console.log(datosreadjson);

            //console.log(datosreadjson);
        }else{
            msg = {'codmsg':400,'typemessage':'Error' ,'descriptionmessage':'No se encontro datos de ruc ni clave'};
        }
    }catch(error){
        console.error('Error al procesar los registros:', error);
    }

    return msg;
}
module.exports={
    processRecords
}