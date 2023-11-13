//const logger = require('../utils/logger');
/* 
*   Especificacion de Importaciones Necesarias
*/
const   {   consultarDatos,
            actualizarutaspdf
        }   =   require('../database/callstoreprocedure');
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

// Cargar la plantilla HTML
const templatePath      =   path.join(__dirname, '..','template', 'Template_Factura.html');
const source            =   fs.readFileSync(templatePath, 'utf8');
 // Ruta completa a la plantilla HTML (ajusta la ruta según tu estructura)
const template          =   Handlebars.compile(source);

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
                const   xmlResponse =  result.RespuestaAutorizacionComprobante.autorizaciones !== null ? result.RespuestaAutorizacionComprobante.autorizaciones.autorizacion.comprobante : '';
                //console.log('Respuesta ==>> ',xmlResponse);
                let     jsResponse;
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
const convertxmltopdf = async(datosxml,rutadestino)=>{
    let contador = 0;
    let documentosmap           =   [];
    for(const datoxml of datosxml){
        let datosfactura        =   [];
        let detallefactura      =   [];    
        let datosinfoadicional  =   [];
        /**
         * Declaracion Variables Globales
         */
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
            /** Infor Tributaria */
            const infoTributaria                =   factura.infoTributaria[0];
            const ambiente                      =   infoTributaria.ambiente[0] === '2' ? 'PRODUCCION' : 'PREUBAS'; //Valor Neto
            const tipoEmision                   =   infoTributaria.tipoEmision[0] === '1' ? 'NORMAL': 'OFFLINE';//Valor Neto
            const razonSocial                   =   infoTributaria.razonSocial[0];//Valor Neto
            const existenombcomercial           =   !!infoTributaria.nombreComercial;
            const nombreComercial               =   existenombcomercial ? infoTributaria.nombreComercial[0] : razonSocial;//Valor Neto
            const ruc                           =   infoTributaria.ruc[0];//Valor Neto
            const claveAcceso                   =   infoTributaria.claveAcceso[0];//Valor Neto
            const codDoc                        =   infoTributaria.codDoc[0];//Valor Neto
            const estab                         =   infoTributaria.estab[0];//Valor Neto
            const ptoEmi                        =   infoTributaria.ptoEmi[0];//Valor Neto
            const secuencial                    =   infoTributaria.secuencial[0];//Valor Neto
            const dirMatriz                     =   infoTributaria.dirMatriz[0];//Valor Neto
            const existeagenteretencion         =   !!infoTributaria.agenteRetencion;
            const agenteRetencion               =   existeagenteretencion ? infoTributaria.agenteRetencion[0]: '';//Valor Neto
            const cadenaAgenteRetencion         =   agenteRetencion>0 ? `AGENTE RETENCIÓN RESOLUCIÓN No. ${agenteRetencion}`: '';
            const existecontribuyenterimpe      =   !!infoTributaria.contribuyenteRimpe;
            const contribuyenteRimpe            =   existecontribuyenterimpe ? infoTributaria.contribuyenteRimpe[0] : '';
            /**Info Factura */
            const infoFactura                   =   factura.infoFactura[0];//valor neto
            const fechaEmision                  =   infoFactura.fechaEmision[0];//valor neto
            const existedirestablecimiento      =   !!infoFactura.dirEstablecimiento;
            const dirEstablecimiento            =   existedirestablecimiento ? infoFactura.dirEstablecimiento[0] : dirMatriz;//valor neto
            const existecontribuyenteesp        =   !!infoFactura.contribuyenteEspecial;
            const contribuyenteEspecial         =   existecontribuyenteesp   ? infoFactura.contribuyenteEspecial[0]: 'NO ES CONTRIBUYENTE ESPECIAL';//valor neto
            const existeobligadocontabilidad    =   !!infoFactura.obligadoContabilidad;
            const obligadoContabilidad          =   existeobligadocontabilidad ? infoFactura.obligadoContabilidad[0] : 'NO';//valor neto
            const tipoIdentificacionComprador   =   infoFactura.tipoIdentificacionComprador[0];//valor neto
            const existeguia                    =   !!infoFactura.guiaRemision;
            const guiaRemision                  =   existeguia ? infoFactura.guiaRemision[0] : '000-000-000000000';
            const razonSocialComprador          =   infoFactura.razonSocialComprador[0];//valor neto
            const identificacionComprador       =   infoFactura.identificacionComprador[0];//valor neto
            const existedircomprador            =   !!infoFactura.direccionComprador;
            const direccionComprador            =   existedircomprador ? infoFactura.direccionComprador[0]:'N/A';//valor neto
            const totalSinImpuestos             =   parseFloat(infoFactura.totalSinImpuestos[0]); //valor neto
            const existetotdescuento            =   !!infoFactura.totalDescuento;
            const totalDescuento                =   existetotdescuento ?  parseFloat(infoFactura.totalDescuento[0]):0; //valor neto
            const existepropina                 =   !!infoFactura.propina;
            const propina                       =   existepropina ?  parseFloat(infoFactura.propina[0]):0.00; //Valor neto
            const importeTotal                  =   parseFloat(infoFactura.importeTotal[0]); //Valor Neto
            const existemoneda                  =   !!infoFactura.moneda;
            const moneda                        =   existemoneda ? infoFactura.moneda[0]: 'DOLAR'; //Valor Neto
            
            /** se Recorrera el Arreglo Total Con Impuesto */
            let codigo                          =   0;
            let codigoPorcentaje                =  '0';
            let descuentoAdicional              =   0.00;
            let baseImponible12                 =   0.00;
            let baseImponible0                  =   0.00;
            let noobjetoiva                     =   0.00;
            let excentoiva                      =   0.00;
            let tarifa                          =   0;
            let valor                           =   0.00;
            
            const totalConImpuestos             =   infoFactura.totalConImpuestos[0]; //Arreglo
            for(const totalimpuesto of totalConImpuestos.totalImpuesto){
                codigo                          =   totalimpuesto.codigo[0];       
                codigoPorcentaje                =   totalimpuesto.codigoPorcentaje[0];     
                const existedescuento           =   !!totalimpuesto.descuentoAdicional;
                descuentoAdicional              =   existedescuento ? totalimpuesto.descuentoAdicional[0] : 0;       
                const existetarifa              =   !!totalimpuesto.tarifa;
                tarifa                          =   existetarifa ? totalimpuesto.tarifa[0]: codigoPorcentaje === '2' ? '12' : '0';       
                valor                           =   parseFloat(totalimpuesto.valor[0]);    
                switch (codigoPorcentaje) {
                     //Iva 0%
                    case '0':
                        baseImponible12         =   0.00
                        baseImponible0          =   parseFloat(totalimpuesto.baseImponible[0]);  
                        noobjetoiva             =   0.00;
                        excentoiva              =   0.00;
                        break
                    //Iva 12%    
                    case '2':
                        baseImponible12         =   parseFloat(totalimpuesto.baseImponible[0]);      
                        baseImponible0          =   0.00;
                        noobjetoiva             =   0.00;
                        excentoiva              =   0.00;
                        break
                    //Iva 14%
                    case '3':
                        baseImponible12         =   0.00;      
                        baseImponible0          =   0.00;
                        noobjetoiva             =   0.00;
                        excentoiva              =   0.00;
                        break
                     //No Objeto de Iva
                     case '3':
                        baseImponible12         =   0.00;      
                        baseImponible0          =   0.00;
                        noobjetoiva             =   parseFloat(totalimpuesto.baseImponible[0]);  
                        excentoiva              =   0.00;
                        break
                     //No Objeto de Iva
                     case '3':
                        baseImponible12         =   0.00;      
                        baseImponible0          =   0.00;
                        noobjetoiva             =   0.00;
                        excentoiva              =   parseFloat(totalimpuesto.baseImponible[0]); 
                        break
                    /* default:
                      console.log('El valor no es "hola" ni "mundo"') */
                }
                
                
            }
            /** se Recorrera el Arreglo Pagos*/
            const existepagos                   =   !!infoFactura.pagos; //Verifico si existe ese nodo
            const pagos                         =   existepagos ? infoFactura.pagos[0] : '' ; //Arreglo
            let formaPago                       =   '';
            let total                           =   0.00;
            let plazo                           =   0;    
            let unidadTiempo                    =   '';    
            if(existepagos){
                for(const pago of pagos.pago){
                    const existeformapago       =   !!pago.formaPago;
                    formaPago                   =   existeformapago ?  devolverFormaPago(pago.formaPago[0]) : devolverFormaPago('20');
                    total                       =   parseFloat(pago.total[0]);
                    unidadTiempo                =   'DIAS';
                    const existeplazo           =   !!pago.plazo;
                    plazo                       =   existeplazo ? pago.plazo[0] : 0;
                } 
            }else{
                formaPago                       =   devolverFormaPago('20');
                total                           =   parseFloat(importeTotal);
                plazo                           =   0;    
                unidadTiempo                    =   'DIAS';    
            }
            /** Se Recorreo el Arreglo de Detalles  */
            const detalles                      =   factura.detalles[0]; //Arreglo
            for(const detalle of detalles.detalle){
                const existecodprincipal        =   !!detalle.codigoPrincipal;
                const codigoPrincipal           =   existecodprincipal ? detalle.codigoPrincipal[0]:'0001'; //Obligatorio
                const descripcion               =   detalle.descripcion[0]; //Obligatorio
                const cantidad                  =   parseFloat(detalle.cantidad[0]); //Obligatorio
                const precioUnitario            =   parseFloat(detalle.precioUnitario[0]);
                const existedescuento           =   !!detalle.descuento;
                const descuento                 =   existedescuento ? parseFloat(detalle.descuento[0]) : 0.00;
                const precioTotalSinImpuesto    =   parseFloat(detalle.precioTotalSinImpuesto[0]);
                const impuestos                 =   detalle.impuestos[0];
                let   valorimpuesto             =   0.00;
               /*  let   nombrecampo               =   '';
                let   valorcampo                =   ''; */
                const existedetallesadicionales =   !!detalle.detallesAdicionales;
                let   detinfoadicional          =   existedetallesadicionales ? '':'S/I';
                if(existedetallesadicionales){
                    const detallesadicionales   =   detalle.detallesAdicionales[0];
                    for(const detalleadicional of detallesadicionales.detAdicional){
                        /* nombrecampo             =   detalleadicional.$.nombre;
                        valorcampo              =   detalleadicional.$.valor;
                        const cadena            =   nombrecampo+' => '+valorcampo; */
                        detinfoadicional        +=  `${detalleadicional.$.nombre} => ${detalleadicional.$.valor}`
                        
                    }
                    
                }
                for(const impuesto of impuestos.impuesto){
                    /* const   codigodetimp            =   impuesto.codigo[0];
                    const   codigoPorcentajedetimp  =   impuesto.codigoPorcentaje[0];
                    const   tarifadetimp            =   impuesto.tarifa[0];
                    const   baseImponibledetimp     =   impuesto.baseImponible[0]; */
                            valorimpuesto           +=  parseFloat(impuesto.valor[0]);
                }
                
                const detallesd                     =   { 
                                                            item:               codigoPrincipal         ,
                                                            description:        descripcion             , 
                                                            quantity:           cantidad                , 
                                                            price:              precioUnitario          ,
                                                            desc:               descuento               ,
                                                            preciosinimp:       precioTotalSinImpuesto  ,
                                                            valorimp:           valorimpuesto           ,
                                                            totalitem:          precioTotalSinImpuesto  ,
                                                            detinfoadicional :  detinfoadicional
                                                        };
                
                detallefactura.push(detallesd);
                
            }
            const   existeInfoAdicional         =   !!factura.infoAdicional; //Verifico si existe ese nodo
            const   infoAdicional               =   existeInfoAdicional ? factura.infoAdicional[0]:'' ;//Arreglo
            let     informacioncampo            =   '';
            let     nombrecampo                 =   '';
            if (existeInfoAdicional){
                for(const adicional of infoAdicional.campoAdicional){
                    informacioncampo            =   adicional._
                    nombrecampo                 =   adicional.$.nombre
                    datosinfoadicional.push({
                                                datos : nombrecampo+' : '+ informacioncampo , 
                                                campo : nombrecampo, 
                                                valorcampo : informacioncampo
                                            });
                    /* console.log('Info Adicional',informacioncampo);
                    console.log('NOmbre Campo',nombrecampo); */
                }
            }
            
            /** */
            const nombrearchivo                 =   ruc+'-'+estab+'-'+ptoEmi+'-'+secuencial+'.pdf';
            /** 
             * Almacenar los datos de la factura como : razon Social, total , etc
            */
            let ice     =   0.00;
            let irbpnr  =   0.00;
            datosfactura = {
                //infoFactura                  ,
                nombrearchivo                   ,
                fechaEmision                    ,
                dirEstablecimiento              ,
                contribuyenteEspecial           ,
                obligadoContabilidad            ,
                tipoIdentificacionComprador     ,
                razonSocialComprador            ,
                identificacionComprador         ,
                direccionComprador              ,
                totalSinImpuestos               ,
                propina                         ,
                importeTotal                    ,
                totalDescuento                  ,
                moneda                          ,
                guiaRemision                    ,
                /** Infor Tributaria */
                ambiente                        ,
                tipoEmision                     ,
                razonSocial                     ,
                nombreComercial                 ,
                ruc                             ,
                claveAcceso                     ,
                codDoc                          ,
                estab                           ,
                ptoEmi                          ,
                secuencial                      ,
                dirMatriz                       ,
                agenteRetencion                 ,
                cadenaAgenteRetencion           ,
                contribuyenteRimpe              ,
                /** se Recorrera el Arreglo Total Con Impuesto */
                codigo                          ,
                codigoPorcentaje                ,
                descuentoAdicional              ,
                baseImponible12                 ,
                baseImponible0                  ,
                noobjetoiva                     ,
                excentoiva                      ,
                tarifa                          ,
                valor                           ,
                ice                             ,
                irbpnr                          ,
                /** se Recorrera el Arreglo Pagos*/
                formaPago                       ,
                total                           ,
                plazo                           ,    
                unidadTiempo                    ,   
                detalles:detallefactura         ,
                datosinfoadicional              
                               
            };
            documentosmap.push(datosfactura);
        }
        //console.log('Datos xml >>> ',datoxml.xml);
    }
    return documentosmap;
}
const generaFacturaPdf      =   async(invoiceDatos,pathdestino,nombre) =>  {
    let archivosgenerados   =   [];

    for(const invoiceData of invoiceDatos){
       // console.log('Datos Factura ',invoiceData);
        const outputPath        =   path.join(pathdestino, invoiceData.nombrearchivo);
        const html              =   template(invoiceData);
        // Crear un navegador y una página
        const browser           =   await puppeteer.launch();
        const page              =   await browser.newPage();

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

        archivosgenerados.push({claveacceso:invoiceData.claveAcceso,rutaarchivo : outputPath});
        console.log('PDF de factura generado.');
    }
    return archivosgenerados;
}
const actualizarutaspdfbd   =   async(parametro,query,rutaspdf)=>{
    for(const rutapdf of rutaspdf){
        const claveacceso       =   rutapdf.claveacceso;
        const rutapdfguardado   =   rutapdf.rutaarchivo;
        const datosactualizados =   await actualizarutaspdf(query,parametro,claveacceso,rutapdfguardado);

        
    }
    return true;
}
function devolverFormaPago (codformapago){
    let descformapago       =   'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO' ;
    switch (codformapago){
        case '01':
            descformapago   =   'SIN UTILIZACION DEL SISTEMA FINANCIERO'
            break
        case '15':
            descformapago   =   'COMPENSACIÓN DE DEUDAS'
            break
        case '16':
            descformapago   =   'TARJETA DE DÉBITO'
            break
        case '17':
            descformapago   =   'DINERO ELECTRÓNICO'
            break
        case '18':
            descformapago   =   'TARJETA PREPAGO'
            break
        case '19':
            descformapago   =   'TARJETA DE CRÉDITO'
            break
        case '20':
            descformapago   =   'OTROS CON UTILIZACIÓN DEL SISTEMA FINANCIERO'
            break
        case '21':
            descformapago   =   'ENDOSO DE TÍTULOS'
            break
    }
    return descformapago;
}
module.exports={
    readjsonbd,
    convertxmltopdf,
    generaFacturaPdf,
    actualizarutaspdfbd
}