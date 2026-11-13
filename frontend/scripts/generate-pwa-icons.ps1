Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot ".."
$public = Join-Path $root "public"
$size = 1024
$master = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($master)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

function New-GradientBrush([System.Drawing.RectangleF]$bounds, [System.Drawing.Color[]]$colors, [single[]]$positions, [single]$angle) {
  $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($bounds, $colors[0], $colors[-1], $angle)
  $blend = [System.Drawing.Drawing2D.ColorBlend]::new($colors.Length)
  $blend.Colors = $colors
  $blend.Positions = $positions
  $brush.InterpolationColors = $blend
  return $brush
}

function New-LogoPath {
  $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $path.StartFigure()
  $path.AddBezier(270,800, 270,620, 270,470, 270,430)
  $path.AddBezier(270,430, 270,286, 365,205, 515,205)
  $path.AddLine(515,205, 870,205)
  $path.AddBezier(870,205, 860,305, 790,370, 690,370)
  $path.AddLine(690,370, 545,370)
  $path.AddBezier(545,370, 425,370, 345,435, 300,555)
  $path.AddBezier(300,555, 350,475, 425,450, 530,450)
  $path.AddLine(530,450, 790,450)
  $path.AddBezier(790,450, 780,530, 720,585, 635,585)
  $path.AddLine(635,585, 500,585)
  $path.AddLine(500,585, 500,650)
  $path.AddBezier(500,650, 500,735, 425,800, 330,800)
  $path.AddLine(330,800, 270,800)
  $path.CloseFigure()
  return $path
}

try {
  $canvas = [System.Drawing.RectangleF]::new(0, 0, $size, $size)
  $base = New-GradientBrush $canvas @(
    [System.Drawing.Color]::FromArgb(255,56,168,245),
    [System.Drawing.Color]::FromArgb(255,21,84,245),
    [System.Drawing.Color]::FromArgb(255,34,183,242)
  ) @(0.0,0.48,1.0) 45
  $graphics.FillRectangle($base, 0, 0, $size, $size)
  $base.Dispose()

  $waveTop = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $waveTop.AddBezier(-30,185, 180,35, 420,20, 780,35)
  $waveTop.AddLine(780,35, 610,260)
  $waveTop.AddBezier(610,260, 480,395, 285,345, -30,570)
  $waveTop.CloseFigure()
  $waveTopBrush = New-GradientBrush $canvas @(
    [System.Drawing.Color]::FromArgb(115,97,200,248),
    [System.Drawing.Color]::FromArgb(0,20,114,245)
  ) @(0.0,1.0) 45
  $graphics.FillPath($waveTopBrush, $waveTop)
  $waveTop.Dispose(); $waveTopBrush.Dispose()

  $waveBottom = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $waveBottom.AddBezier(-20,790, 175,610, 335,635, 510,790)
  $waveBottom.AddBezier(510,790, 675,930, 835,875, 1050,735)
  $waveBottom.AddLine(1050,735, 1050,1060)
  $waveBottom.AddLine(1050,1060, -20,1060)
  $waveBottom.CloseFigure()
  $waveBottomBrush = New-GradientBrush $canvas @(
    [System.Drawing.Color]::FromArgb(105,8,59,232),
    [System.Drawing.Color]::FromArgb(140,80,197,245)
  ) @(0.0,1.0) 0
  $graphics.FillPath($waveBottomBrush, $waveBottom)
  $waveBottom.Dispose(); $waveBottomBrush.Dispose()

  $letterPath = New-LogoPath
  $shadowMatrix = [System.Drawing.Drawing2D.Matrix]::new()
  $shadowMatrix.Translate(0, 10)
  $letterPath.Transform($shadowMatrix)
  $shadowBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(55,5,31,115))
  $graphics.FillPath($shadowBrush, $letterPath)
  $shadowBrush.Dispose(); $shadowMatrix.Dispose()
  $letterPath.Dispose()

  $letterPath = New-LogoPath
  $letterBrush = New-GradientBrush $canvas @(
    [System.Drawing.Color]::FromArgb(255,255,255,255),
    [System.Drawing.Color]::FromArgb(255,234,241,255)
  ) @(0.0,1.0) 45
  $graphics.FillPath($letterBrush, $letterPath)
  $letterPath.Dispose(); $letterBrush.Dispose()

  $outputs = @(
    @{ Path = (Join-Path $public "icons/icon-192.png"); Size = 192 },
    @{ Path = (Join-Path $public "icons/icon-512.png"); Size = 512 },
    @{ Path = (Join-Path $public "icons/icon-512-maskable.png"); Size = 512 },
    @{ Path = (Join-Path $public "apple-touch-icon.png"); Size = 180 }
  )
  foreach ($output in $outputs) {
    $bitmap = [System.Drawing.Bitmap]::new($output.Size, $output.Size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $resize = [System.Drawing.Graphics]::FromImage($bitmap)
    $resize.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $resize.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $resize.DrawImage($master, 0, 0, $output.Size, $output.Size)
    $resize.Dispose()
    $bitmap.Save($output.Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
  }
}
finally {
  $graphics.Dispose()
  $master.Dispose()
}
