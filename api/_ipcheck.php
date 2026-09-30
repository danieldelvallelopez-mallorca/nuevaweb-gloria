<?php
// TEMPORAL (se borra en minutos): qué cabecera trae la IP real detrás de la CDN. No muestra IPs.
header('Content-Type: application/json');
$want = '130b56f11584';
$h = fn($v) => $v === null ? null : substr(hash('sha256', trim(explode(',', $v)[0])), 0, 12);
echo json_encode([
  'REMOTE_ADDR' => $h($_SERVER['REMOTE_ADDR'] ?? null) === $want,
  'CF_CONNECTING_IP' => isset($_SERVER['HTTP_CF_CONNECTING_IP']) ? ($h($_SERVER['HTTP_CF_CONNECTING_IP']) === $want ? 'real' : 'otra') : 'ausente',
  'X_FORWARDED_FOR_first' => isset($_SERVER['HTTP_X_FORWARDED_FOR']) ? ($h($_SERVER['HTTP_X_FORWARDED_FOR']) === $want ? 'real' : 'otra') : 'ausente',
  'X_REAL_IP' => isset($_SERVER['HTTP_X_REAL_IP']) ? ($h($_SERVER['HTTP_X_REAL_IP']) === $want ? 'real' : 'otra') : 'ausente',
]);
