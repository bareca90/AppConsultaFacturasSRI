//const logger = require('../utils/logger');
/* 
*   Especificacion de Importaciones Necesarias
*/
const {consultarDatos}  =   require('../database/callstoreprocedure');
//const fs                =   require('fs').promises;
const fs                =   require('fs');
const { Console }       =   require('console');
const soap              =   require('soap');
const { XMLParser   ,
        XMLBuilder  , 
        XMLValidator
      }                 =   require("fast-xml-parser");
const parser            =   new XMLParser();
const xml2js            =   require('xml2js');
/* const xml2js            =   require('xml2js');
const parser            =   new xml2js.Parser({ explicitCharkey: true }); */
const { PDFDocument     , 
        rgb             ,
        StandardFonts   ,
        PageSizes
      }                 =   require("pdf-lib");

const bwipjs            =   require("bwip-js");
const path              =   require("path");
const puppeteer         =   require('puppeteer');
const Handlebars        =   require('handlebars');
/* 
*   Declaración de variables Globales
*/
const url               =   'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl';
//const ruc               =   '1206702175001'; // reemplazar con el RUC correspondiente
//const clave             =   'BARECA0608'; // reemplazar con la clave de acceso correspondiente
const outputPath        =   path.join("\\\\10.100.120.19\\Erpdocumentos\\pdfdocssri", "factura.pdf");
// Cargar la plantilla HTML
const templatePath      =   path.join(__dirname, '..','template', 'Template_Factura.html');
const source            =   fs.readFileSync(templatePath, 'utf8');
 // Ruta completa a la plantilla HTML (ajusta la ruta según tu estructura)
const template          =   Handlebars.compile(source);
/**
 * Declaracion Variables Globales
 */
let datosfactura            =   [];
let detallefactura          =   [];    
let detalletotalconimpuesto =   [];
/* 
*   Función que llevara toda la logica de recorrido y obtencion de los xml desde el sri
*/
const  readjsonbd       =   async(ruc,password,pathdestino,datosjson)    =>  {
    let cantidad                =   10;
    let datosxmlsri             =   [];
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
                        //reject(err);
                        reject('Error al consumir el Web Services');
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
                        //reject('Error con El Web Services =>>',err);
                        reject('Error al tratar el documento autorizado');
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
                /* const options = {
                    attributeNamePrefix: '',
                    ignoreAttributes: false,
                    explicitCharkey: true,
                }; */
                /* const options = {
                    ignoreAttributes: false,
                    attributeValueProcessor: (name, val, jPath) => {
                        if (name === 'claveAcceso') {
                          return String(val); // Convertir el valor a cadena (string)
                        }
                        return val;
                    },
                }; */
                /* const options = {
                    ignoreAttributes: false,
                }; */
               /*  let jsResponse;
                parser.parseString(xmlResponse, (err, result) => {
                    if (err) {
                      console.error('Error al parsear el XML:', err);
                      return;
                    } else {
                      // jsResponse es un objeto con la estructura del XML, con valores como texto
                      //console.log(jsResponse);
                      jsResponse    =   result;
                    }
                }); */
                /**
                 * Se parsea el xml string que se recibe , lo convertimos a objeto json iterable
                 */
                
                let jsResponse;
                xml2js.parseString(xmlResponse, (err, result) => {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    jsResponse  =   result;
                });
                const valoresxml = { claveacceso: claveacceso.claveAcceso, xml: jsResponse, pathdestino: pathdestino };
                datosxmlsri.push(valoresxml);  
            }else{
                console.log(`La clave de acceso >>> ${claveacceso.claveAcceso} >>> no arroja datos `);
            }
        }catch(error){
            console.log(error);
        }

        cantidad++;
    }

    return datosxmlsri;
}
const convertxmltopdf = async(datosxml)=>{
    let contador = 0;
    for(const datoxml of datosxml){
        const xml  =    datoxml.xml;
        /** 
         * Se Valida si el documento es factura
        */
        if (xml.factura){
            /**
            * Recorrer el XML completo y almacenar los valores en variables
            */

            contador+=1       ;

            const factura                       =   xml.factura;
            /**Info Factura */
            const infoFactura                   =   factura.infoFactura[0];//valor neto
            const fechaEmision                  =   infoFactura.fechaEmision[0];//valor neto
            const dirEstablecimiento            =   infoFactura.dirEstablecimiento[0];//valor neto
            const contribuyenteEspecial         =   infoFactura.contribuyenteEspecial[0];//valor neto
            const obligadoContabilidad          =   infoFactura.obligadoContabilidad[0];//valor neto
            const tipoIdentificacionComprador   =   infoFactura.tipoIdentificacionComprador[0];//valor neto
            const razonSocialComprador          =   infoFactura.razonSocialComprador[0];//valor neto
            const identificacionComprador       =   infoFactura.identificacionComprador[0];//valor neto
            const totalSinImpuestos             =   infoFactura.totalSinImpuestos[0]; //valor neto
            const propina                       =   infoFactura.propina[0]; //Valor neto
            const importeTotal                  =   infoFactura.importeTotal[0]; //Valor Neto
            const moneda                        =   infoFactura.moneda[0]; //Valor Neto
            /** Infor Tributaria */
            const infoTributaria                =   factura.infoTributaria[0];
            const ambiente                      =   infoTributaria.ambiente[0] === '2' ? 'PRODUCCION' : 'PREUBAS'; //Valor Neto
            const tipoEmision                   =   infoTributaria.tipoEmision[0] === '1' ? 'NORMAL': 'OFFLINE';//Valor Neto
            const razonSocial                   =   infoTributaria.razonSocial[0];//Valor Neto
            const nombreComercial               =   infoTributaria.nombreComercial[0];//Valor Neto
            const ruc                           =   infoTributaria.ruc[0];//Valor Neto
            const claveAcceso                   =   infoTributaria.claveAcceso[0];//Valor Neto
            const codDoc                        =   infoTributaria.codDoc[0];//Valor Neto
            const estab                         =   infoTributaria.estab[0];//Valor Neto
            const ptoEmi                        =   infoTributaria.ptoEmi[0];//Valor Neto
            const secuencial                    =   infoTributaria.secuencial[0];//Valor Neto
            const dirMatriz                     =   infoTributaria.dirMatriz[0];//Valor Neto

            /** se Recorrera el Arreglo Total Con Impuesto */
            let codigo                          =   0;
            let codigoPorcentaje                =   0;
            let descuentoAdicional              =   0;
            let baseImponible                   =   0;
            let tarifa                          =   0;
            let valor                           =   0;
            const totalConImpuestos             =   infoFactura.totalConImpuestos[0]; //Arreglo
            for(const totalimpuesto of totalConImpuestos.totalImpuesto){
                codigo                          =   totalimpuesto.codigo[0];       
                codigoPorcentaje                =   totalimpuesto.codigoPorcentaje[0];       
                descuentoAdicional              =   totalimpuesto.descuentoAdicional[0];       
                baseImponible                   =   totalimpuesto.baseImponible[0];       
                tarifa                          =   totalimpuesto.tarifa[0];       
                valor                           =   totalimpuesto.valor[0];       
            }
            /** se Recorrera el Arreglo Pagos*/
            const pagos                         =   infoFactura.pagos[0]; //Arreglo
            let formaPago                       =   0;
            let total                           =   0;
            let plazo                           =   0;    
            let unidadTiempo                    =   '';    
            for(const pago of pagos.pago){
                    formaPago                      =   pago.formaPago[0];
                    total                          =   pago.total[0];
                    unidadTiempo                   =   'DIAS';
                    plazo                          =   0;
            } 
            /** Se Recorreo el Arreglo de Detalles  */
            const detalles                      =   factura.detalles[0]; //Arreglo
            for(const detalle of detalles.detalle){
                const codigoPrincipal           =   detalle.codigoPrincipal[0];
                const descripcion               =   detalle.descripcion[0];
                const cantidad                  =   detalle.cantidad[0];
                const precioUnitario            =   detalle.precioUnitario[0];
                const descuento                 =   detalle.descuento[0];
                const precioTotalSinImpuesto    =   detalle.precioTotalSinImpuesto[0];
                const impuestos                 =   detalle.impuestos[0];
                let   valorimpuesto             =   0;
                for(const impuesto of impuestos.impuesto){
                    const   codigodetimp            =   impuesto.codigo[0];
                    const   codigoPorcentajedetimp  =   impuesto.codigoPorcentaje[0];
                    const   tarifadetimp            =   impuesto.tarifa[0];
                    const   baseImponibledetimp     =   impuesto.baseImponible[0];
                            valorimpuesto           +=  impuesto.valor[0];
                }
                
                const detallesd                 =   { 
                                                        item:           codigoPrincipal         ,
                                                        description:    descripcion             , 
                                                        quantity:       cantidad                , 
                                                        price:          precioUnitario          ,
                                                        desc:           descuento               ,
                                                        preciosinimp:   precioTotalSinImpuesto  ,
                                                        valorimp:       valorimpuesto           ,
                                                        totalitem:      precioTotalSinImpuesto +  valorimpuesto
                                                    };
                
                detallefactura.push(detallesd);
            }

            const existeInfoAdicional           =   !!factura.infoAdicional; //Verifico si existe ese nodo
            const infoAdicional                 =   existeInfoAdicional ? factura.infoAdicional[0]:'' ;//Arreglo
            if (existeInfoAdicional){
                for(const adicional of infoAdicional.campoAdicional){
                    console.log('Info Adicional',adicional);
                }
            }
            /** 
             * Almacenar los datos de la factura como : razon Social, total , etc
            */

            datosfactura = {
                infoFactura                  ,
                fechaEmision                 ,
                dirEstablecimiento           ,
                contribuyenteEspecial        ,
                obligadoContabilidad         ,
                tipoIdentificacionComprador  ,
                razonSocialComprador         ,
                identificacionComprador      ,
                totalSinImpuestos            ,
                propina                      ,
                importeTotal                 ,
                moneda                       ,
                /** Infor Tributaria */
                infoTributaria               ,
                ambiente                     ,
                tipoEmision                  ,
                razonSocial                  ,
                nombreComercial              ,
                ruc                          ,
                claveAcceso                  ,
                codDoc                       ,
                estab                        ,
                ptoEmi                       ,
                secuencial                   ,
                dirMatriz                    ,
                /** se Recorrera el Arreglo Total Con Impuesto */
                codigo                       ,
                codigoPorcentaje             ,
                descuentoAdicional           ,
                baseImponible                ,
                tarifa                       ,
                valor                        ,
                /** se Recorrera el Arreglo Pagos*/
                formaPago                    ,
                total                        ,
                plazo                        ,    
                unidadTiempo                 ,    
                detalles:detallefactura
            };
            const pdfgenerado = await generateInvoicePDF(datosfactura);
        

        }
        //console.log('Datos xml >>> ',datoxml.xml);
    }
}
const generateInvoicePDF    =   async(invoiceData) =>  {
    // Datos de la factura (simulados)
    
   
    const html = template(invoiceData);

    // Crear un navegador y una página
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Establecer el contenido HTML de la página
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    // Generar el PDF
    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
    });

    // Cerrar el navegador
    await browser.close();

    console.log('PDF de factura generado.');
}

module.exports={
    readjsonbd,
    convertxmltopdf
}