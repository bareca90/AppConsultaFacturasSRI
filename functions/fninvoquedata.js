//const logger = require('../utils/logger');
/* 
*   Especificacion de Importaciones Necesarias
*/
const {consultarDatos}  =   require('../database/callstoreprocedure');
const fs                =   require('fs').promises;
const { Console }       =   require('console');
const soap              =   require('soap');
const { XMLParser   ,
        XMLBuilder  , 
        XMLValidator
      }                 =   require("fast-xml-parser");
const parser            =   new XMLParser();
const { PDFDocument, 
        rgb 
      }                 =   require("pdf-lib");
const bwipjs            =   require("bwip-js");
const path              =   require("path");

/* 
*   Declaración de variables Globales
*/
const url               =   'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';
//const ruc               =   '1206702175001'; // reemplazar con el RUC correspondiente
//const clave             =   'BARECA0608'; // reemplazar con la clave de acceso correspondiente
const outputPath        =   path.join("\\\\10.100.120.19\\Erpdocumentos\\pdfdocssri", "factura.pdf");

/* 
*   Función que llevara toda la logica de recorrido y obtencion de los xml desde el sri
*/
const  readjsonbd       =   async(ruc,password,pathdestino,datosjson)    =>  {
    let cantidad        =   10;
    let cabecera        =   [];
    let detallefactura  =   [];    
    let datosxmlsri     =   [];
    /* 
    *   Leo los datos que son enviados en el json para desestructurarlo
    */
    for(const claveacceso of datosjson){
        /**Por cada clav de acceso se lee,consulta y obtiene el xml */
        // Crear el objeto de solicitud para el método 'autorizacionComprobante'
        const requestArgs = {
            claveAccesoComprobante: claveacceso.claveAcceso,
        };
        try{
            //Creamos el cliente tipo soap
            const client = await new Promise((resolve, reject) => {
                soap.createClient(url, (err, client) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(client);
                    }
                });
            });
            //Añadimos los datos de Headers
            client.addSoapHeader(
                {
                    'tns:ClaveAcceso': password,
                    'tns:Ruc': ruc,
                },
                '',
                'tns',
                'http://www.w3.org/2000/09/xmldsig#'
            );
            //Creamos la promesa para el endpoint autorizacion comprobantes
            const result = await new Promise((resolve, reject) => {
                client.autorizacionComprobante(requestArgs, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
            //Verificamos que exista el objeto autorizaciones
            //let jsResponse;
            
            //console.log('Antes >>>>',result);
            if (result && result.RespuestaAutorizacionComprobante && result.RespuestaAutorizacionComprobante.autorizaciones && result.RespuestaAutorizacionComprobante.autorizaciones.autorizacion){
                const xmlResponse =  result.RespuestaAutorizacionComprobante.autorizaciones !== null ? result.RespuestaAutorizacionComprobante.autorizaciones.autorizacion.comprobante : '';
                const options = {
                    attributeNamePrefix: '',
                    ignoreAttributes: false,
                };
                const jsResponse = parser.parse(xmlResponse, options);
                const valoresxml = { claveacceso: claveacceso.claveAcceso, xml: jsResponse, pathdestino: pathdestino };
                datosxmlsri.push(valoresxml);  
               
                //console.log(datosxmlsri);
                
                
    
                //console.log('Despues de >>>>',jsResponse);

            }else{
                console.log(`La clave de acceso >>> ${claveacceso.claveAcceso} >>> no arroja datos `);
            }
            



        }catch(error){
            console.log(error);
        }

        
        
        //datos desde 

        //hasta


       // console.log(requestArgs);
        
        /* console.log(ruc);
        console.log(password);
        console.log(claveacceso.codmsg)
        console.log(claveacceso.descripcionmsg)
        console.log(claveacceso.tipoDocumento)
        console.log(claveacceso.nroDocumento)
        console.log(claveacceso.rucEmisor)
        console.log(claveacceso.razonSocial)
        console.log(claveacceso.fechaEmision)
        console.log(claveacceso.claveAcceso) */
        cantidad++;
    }

    return datosxmlsri;
}
const convertxmltopdf = async(datosxml)=>{
    for(const datoxml of datosxml){
        const xml  =    datoxml.xml;
        /** 
         * Se Valida si el documento es factura
        */
        if (datoxml['factura']){
            /**
            * Recorrer el XML completo y almacenar los valores en variables
            */
            /*
            const factura                       =   jsResponse['factura'];
            const infoTributaria                =   factura['infoTributaria'];
            const ambiente                      =   infoTributaria['ambiente'];
            const tipoEmision                   =   infoTributaria['tipoEmision'];
            const ruc                           =   infoTributaria['ruc'];    
            const claveAcceso                   =   infoTributaria['claveAcceso'];    
            const codDoc                        =   infoTributaria['codDoc'];    
            const estab                         =   infoTributaria['estab'];    
            const ptoEmi                        =   infoTributaria['ptoEmi'];    
            const secuencial                    =   infoTributaria['secuencial'];    
            const dirMatriz                     =   infoTributaria['dirMatriz'];    
            const agenteRetencion               =   infoTributaria['agenteRetencion'];        
            const infoFactura                   =   factura['infoFactura'];
            const fechaEmision                  =   infoFactura['fechaEmision'];
            const obligadoContabilidad          =   infoFactura['obligadoContabilidad'];
            const tipoIdentificacionComprador   =   infoFactura['tipoIdentificacionComprador'];
            const razonSocialComprador          =   infoFactura['razonSocialComprador'];
            const identificacionComprador       =   infoFactura['identificacionComprador'];
            const totalSinImpuestos             =   infoFactura['totalSinImpuestos'];
            const totalDescuento                =   infoFactura['totalDescuento'];
            
            
            const razonSocial                   =   infoTributaria['razonSocial'];
            const nombreComercial               =   infoTributaria['nombreComercial'];
            const rucEmisor                     =   infoTributaria['ruc'];
            */
            /** 
             * Almacenar los datos de la cabcera como : razon Social, total , etc
            */
            // Datos de la cabecera de la factura simulados
            /*
            cabecera = {
                invoiceNumber   : ruc               ,
                date            : nombreComercial   ,
                customerName    : nombreComercial   ,
            };
            */
            //console.log(`Razón social: ${razonSocial}, Nombre comercial: ${nombreComercial}, RUC emisor: ${rucEmisor}`);
            //console.log(`Total: ${total}`);
            
            //console.log('Datos xml >>> ',cabecera);
            // Recorrer cada detalle y mostrarlo en la consola
            /* const detalles = jsResponse['factura']['detalles']['detalle'];
            detalles.forEach((detalle, index) => {
                const codigoPrincipal   = detalle['codigoPrincipal'];
                const descripcion       = detalle['descripcion'];
                const cantidad          = detalle['cantidad'];
                const precioUnitario    = detalle['precioUnitario'];
                const detallesd         = { item: codigoPrincipal, quantity: cantidad, price: precioUnitario };
                
                detallefactura.push(detallesd);
            });
            console.log(detallefactura); */

            //generateInvoicePDF(cabecera,detallefactura);
        }
        //console.log('Datos xml >>> ',datoxml.xml);
    }
}

module.exports={
    readjsonbd,
    convertxmltopdf
}