# Script para adicionar useBusinessUser em todas as páginas

$pages = @(
    "c:\Users\V4U\Desktop\v4u\src\app\(dashboard)\clientes\page.tsx",
    "c:\Users\V4U\Desktop\v4u\src\app\(dashboard)\profissionais\page.tsx",
    "c:\Users\V4U\Desktop\v4u\src\app\(dashboard)\servicos\page.tsx",
    "c:\Users\V4U\Desktop\v4u\src\app\(dashboard)\dashboard\page.tsx",
    "c:\Users\V4U\Desktop\v4u\src\app\(dashboard)\configuracoes\page.tsx"
)

foreach ($file in $pages) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        
        # Adicionar import se não existir
        if ($content -notmatch "useBusinessUser") {
            $content = $content -replace "import \{ useFirebase \} from '@/firebase'", "import { useFirebase } from '@/firebase'`nimport { useBusinessUser } from '@/contexts/BusinessUserContext'"
        }
        
        # Substituir assinatura da função
        $content = $content -replace "export default function (\w+)\(\{ businessUserId \}: \{ businessUserId\?: string \}\)", "export default function `$1() {`n  const { businessUserId } = useBusinessUser();"
        
        Set-Content -Path $file -Value $content
        Write-Host "Atualizado: $file" -ForegroundColor Green
    }
}

Write-Host "`nPaginas atualizadas! Execute: npm run build" -ForegroundColor Cyan
