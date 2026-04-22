Variables y etiquetas especiales
Dentro del layout escrito en HTML, se pueden utilizar las siguientes notaciones para hacer referencia a variables y otras etiquetas especiales.

#{queryName.columnName}#: Hace referencia a una columna específica del primer registro de resultado de una consulta SQL. En estos casos es recomendable asegurarse de que la consulta obtenga solamente un registro.

#[queryName]#: Hace referencia a todos los registros y columnas de resultado de una consulta SQL. En estos casos es recomendable agregar tipos y alineación a las columnas para que los resultados que se renderizan como <table> se muestren con las columnas formateadas y alineadas correctamente.

<<<page>>>: Inserta un salto de página forzado.

<show condicion="">contenido</show>: Muestra el contenido si se cumple la condicion. Las condiciones de este tipo de etiquetas se definen desde modelo con queries especiales show.condicion. Por ejemplo, si tenemos la query cuyo nombre es show.ramo, la etiqueta que podremos usar será <show ramo="18">contenido</show> y en ese caso se mostrará el contenido solamente si el valor del ramo es 18.
