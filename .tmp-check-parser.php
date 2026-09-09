<?php
// Verifica el parser de hoja de vida contra los archivos reales. Temporal.
require '/Users/joburbanop/Herd/cartera-api/vendor/autoload.php';

$app = require '/Users/joburbanop/Herd/cartera-api/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Imports\SanMiguel\SanMiguelLifeSheetParser;

$parser = $app->make(SanMiguelLifeSheetParser::class);
$dir = '/Users/joburbanop/Herd/cartera-api/app/imports';

$files = $parser->discover($dir);
echo "Libros detectados: ".count($files)."\n";
foreach ($files as $f) {
    echo "  ".basename($f)."\n";
}
echo "\n";

$sheets = $parser->parse($files);
uksort($sheets, fn ($a, $b) => (int) $a <=> (int) $b);

printf("Hojas leidas: %d\n\n", count($sheets));
printf("%-5s %-11s %-4s %14s %14s %-22s %s\n", 'LOTE', 'HOJA', 'PAG', 'SUMA', 'FINANCIADO', 'CLIENTE', 'OBS');
$totalRows = 0;
foreach ($sheets as $lot => $s) {
    $totalRows += count($s->rows);
    printf(
        "%-5s %-11s %-4d %14s %14s %-22s %d\n",
        $lot,
        $s->sheetName,
        count($s->rows),
        number_format((float) $s->sumPayments(), 0),
        number_format((float) $s->financedValue, 0),
        mb_substr($s->clientName, 0, 22),
        count($s->issues),
    );
}
echo "\nFilas de pago totales: {$totalRows}\n";

echo "\n=== Observaciones que descartan datos ===\n";
foreach ($sheets as $lot => $s) {
    foreach ($s->issues as $issue) {
        if (str_contains($issue, 'se omite') || str_contains($issue, 'no es interpretable')) {
            echo "LOTE {$lot}: {$issue}\n";
        }
    }
}

echo "\n=== Lote 49 en detalle ===\n";
foreach ($sheets['49']->rows as $r) {
    printf(
        "  %-11s %14s  %-14s %-30s %s\n",
        $r->date->toDateString(),
        number_format((float) $r->amount, 0),
        $r->receiptNumber ?? '-',
        $r->concept,
        $r->paymentMethod->value,
    );
}
foreach ($sheets['49']->issues as $i) {
    echo "  ! {$i}\n";
}
