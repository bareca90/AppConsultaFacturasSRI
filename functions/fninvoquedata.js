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
const templatePath      =   path.join(__dirname, '..','template', 'factura.html');
const source            =   fs.readFileSync(templatePath, 'utf8');
 // Ruta completa a la plantilla HTML (ajusta la ruta según tu estructura)
const template          =   Handlebars.compile(source);
/**
 * Declaracion Variables Globales
 */
let cabecera                =   [];
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
        if (xml['factura']){
            /**
            * Recorrer el XML completo y almacenar los valores en variables
            */
            contador+=1       ;
            let formapago     ;    
            let total         ;    
            let plazo         ;    
            let unidadTiempo  ;    
            const factura                       =   xml['factura'];
            const infoTributaria                =   factura['infoTributaria'];
            const ambiente                      =   infoTributaria['ambiente'];
            const tipoEmision                   =   infoTributaria['tipoEmision'];
            const razonSocial                   =   infoTributaria['razonSocial'];
            const ruc                           =   infoTributaria['ruc'];    
            const claveAcceso                   =   infoTributaria['claveAcceso'].toString();    
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
            const detalleTotalConImpuesto       =   infoFactura['totalConImpuestos']['totalImpuesto']
            const codigo                        =   detalleTotalConImpuesto['codigo'];
            const codigoPorcentaje              =   detalleTotalConImpuesto['codigoPorcentaje'];
            const baseImponible                 =   detalleTotalConImpuesto['baseImponible'];
            const valor                         =   detalleTotalConImpuesto['valor'];
            const propina                       =   infoFactura['propina'];
            const importeTotal                  =   infoFactura['importeTotal'];
            const moneda                        =   infoFactura['moneda'];
            const pagos                         =   infoFactura['pagos'];
            const valorpago                     =   pagos?.pago;
            if (valorpago !== undefined) {
                formapago                       =   valorpago.formaPago;
                total                           =   valorpago.total;
                plazo                           =   valorpago.plazo;
                unidadTiempo                    =   valorpago.unidadTiempo;
            } else {
                formapago                       =   '20';
                total                           =   importeTotal;
                plazo                           =   0;
                unidadTiempo                    =   'DIAS';
                
            }
            const detalles                      = factura.detalles.detalle;
            if (Array.isArray(detalles) && detalles.length > 1) {
                // Es una lista de registros
                for(const detalle of detalles){
                    const codigoPrincipal       = detalle.codigoPrincipal;
                    const descripcion           = detalle.descripcion;
                    const cantidad              = detalle.cantidad;
                    const precioUnitario        = detalle.precioUnitario;
                    const detallesd             = { item: codigoPrincipal,description:descripcion, quantity: cantidad, price: precioUnitario };
                    
                    detallefactura.push(detallesd);
                    if (contador === 1  ){
                        console.log('Es Mayor a 1 =>',detallefactura);
                    }
                }
            } else if (detalles.length === 1) {
                // Es un solo registro
                let codigoPrincipal             =   detalles.detalle?.codigoPrincipal;
                let descripcion                 =   detalles.detalle?.descripcion;
                let cantidad                    =   detalles.detalle?.cantidad;
                let precioUnitario              =   detalles.detalle?.precioUnitario;
                const detallesd                 = { item: codigoPrincipal,description:descripcion, quantity: cantidad, price: precioUnitario };
                if(codigoPrincipal !== undefined && descripcion !== undefined && cantidad!== undefined && precioUnitario !== undefined){
                    detallefactura.push(detallesd);     
                }                    
                if (contador === 1  ){
                    console.log('Es Igual a 1 =>',detallefactura);
                }
                
            } else {
                let codigoPrincipal             =   'N/A';
                let descripcion                 =   'N/A';
                let cantidad                    =   0;
                let precioUnitario              =   0;
                const detallesd                 = { item: codigoPrincipal,description:descripcion, quantity: cantidad, price: precioUnitario };
                if(codigoPrincipal !== undefined && descripcion !== undefined && cantidad!== undefined && precioUnitario !== undefined){
                    detallefactura.push(detallesd);     
                }               
                if (contador === 1  ){
                    console.log('Es Igual a 0 =>',detallefactura);
                }
                //console.log('El objeto no es válido. ==>',detalles);
            }

            
            /*
            console.log('------------------------------');
            console.log('Indice del Registro',contador);
            console.log('Ambiente >>>',ambiente);
            console.log('Tipo Emision >>>',tipoEmision);
            console.log('Ruc >>>',ruc);
            console.log('Razon Social  >>>',razonSocial);
            console.log('Clave de Acceso >>>',claveAcceso);
            console.log('Cod Doc >>>',codDoc);
            console.log('Establecimiento >>>',estab);
            console.log('Punto Emision >>>',ptoEmi);
            console.log('Secuencial >>>',secuencial);
            console.log('Direccion Matriz >>>',dirMatriz);
            console.log('Agenete de Retención >>>',agenteRetencion);
            console.log('Fecha Emisión >>>',fechaEmision);
            console.log('LLeva Contabilidad >>>',obligadoContabilidad);
            console.log('Tipo de Indentificación  >>>',tipoIdentificacionComprador);
            console.log('Razon Social Comprador   >>>',razonSocialComprador);
            console.log('Identificación Comprador   >>>',identificacionComprador);
            console.log('Total Sin Impuestos >>>',totalSinImpuestos);
            console.log('Total Descuento  >>>',totalDescuento);
            console.log('<<< Datos Totales >>>');
            console.log('Codigo con Impuesto >>>',codigo);
            console.log('Codigo Porcentaje >>>',codigoPorcentaje);
            console.log('Base Imponible >>>',baseImponible);
            console.log('Valor >>>',valor);
            console.log('Propina >>>',propina);
            console.log('Importe Total >>>',importeTotal);
            console.log('Moneda >>>',moneda);
            console.log('<<< Pagos >>>');
            console.log('Forma de Pago >>>',formapago);
            console.log('Total >>>',total);
            console.log('Plazo >>>',plazo);
            console.log('Unidad de Tiempo >>>',unidadTiempo);
            console.log('<<< Detalle >>>');
            console.log('Detalle Fact >>>',detallefactura);      */  
            

             
            /** 
             * Almacenar los datos de la cabcera como : razon Social, total , etc
            */
           // Datos de la cabecera de la factura simulados
           
           cabecera = {
                ambiente,
                tipoEmision,
                ruc,
                razonSocial,
                claveAcceso,
                codDoc,
                estab,
                ptoEmi,
                secuencial,
                dirMatriz,
                agenteRetencion,
                fechaEmision,
                obligadoContabilidad,
                tipoIdentificacionComprador,
                razonSocialComprador,
                identificacionComprador,
                totalSinImpuestos,
                totalDescuento,
                codigo,
                codigoPorcentaje,
                baseImponible,
                valor,
                propina,
                importeTotal,
                moneda,
                formapago,
                total,
                plazo,
                unidadTiempo,
                detalles:detallefactura
           };
           
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
            if(contador===1){
               // console.log('Cabecera Ult =>',cabecera);
                //console.log('Detalle Ult =>',detallefactura);
                const pdfgenerado = await generateInvoicePDF(cabecera);
            }

        }
        //console.log('Datos xml >>> ',datoxml.xml);
    }
}
const generateInvoicePDF    =   async(invoiceHeader) =>  {
    // Datos de la factura (simulados)
    const invoiceData = {
        fecha: '2023-08-22',
        cliente: 'Cliente Ejemplo',
        detalles: [
            { producto: 'Producto 1', cantidad: 2, precio: 50, total: 100 },
            { producto: 'Producto 2', cantidad: 1, precio: 75, total: 75 },
            // Agrega más detalles aquí si es necesario
        ],
        totalGeneral: 175,
        numeroFactura: '123459237482782428478247284728482', // Número de factura
    };
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