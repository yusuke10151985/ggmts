#!/bin/bash

# Fix imports in all MOM related files

# Fix component files
find ./components/mom -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's|@/contexts/MOMContext|@/contexts/mom/MOMContext|g' \
  -e 's|@/services/api|@/services/mom/api|g' \
  -e 's|@/lib/validation-utils|@/lib/mom/validation-utils|g' \
  -e 's|@/lib/google-sheets|@/lib/mom/google-sheets|g' \
  -e 's|@/lib/google-drive|@/lib/mom/google-drive|g' \
  -e 's|@/lib/data-compression|@/lib/mom/data-compression|g' \
  -e 's|@/lib/matrix-conversion|@/lib/mom/matrix-conversion|g' \
  -e 's|@/lib/matrix-flat-conversion|@/lib/mom/matrix-flat-conversion|g' \
  -e 's|@/lib/revision-utils|@/lib/mom/revision-utils|g' \
  -e 's|@/lib/numbering-utils|@/lib/mom/numbering-utils|g' \
  -e 's|@/lib/count-actions|@/lib/mom/count-actions|g' \
  -e 's|@/lib/count-actions-matrix|@/lib/mom/count-actions-matrix|g' \
  -e 's|@/utils/export|@/utils/mom/export|g' \
  -e 's|@/utils/export-pdf|@/utils/mom/export-pdf|g' \
  -e 's|@/utils/export-google-docs|@/utils/mom/export-google-docs|g' \
  -e 's|@/utils/date-helpers|@/utils/mom/date-helpers|g' \
  -e 's|@/utils/timezone|@/utils/mom/timezone|g' \
  -e 's|@/utils/imageProcessing|@/utils/mom/imageProcessing|g' \
  -e 's|@/types|@/types/mom|g' \
  -e 's|@/components/Meet|@/components/mom/Meet|g' \
  -e 's|@/components/MOM|@/components/mom/MOM|g' \
  -e 's|@/components/Load|@/components/mom/Load|g' \
  -e 's|@/components/Export|@/components/mom/Export|g' \
  -e 's|@/components/Attachment|@/components/mom/Attachment|g' \
  -e 's|@/components/Action|@/components/mom/Action|g' \
  -e 's|@/components/Structure|@/components/mom/Structure|g' \
  -e 's|@/components/Multilingual|@/components/mom/Multilingual|g' \
  -e 's|@/components/Matrix|@/components/mom/Matrix|g' \
  -e 's|@/components/Flat|@/components/mom/Flat|g' \
  -e 's|@/components/Task|@/components/mom/Task|g' \
  -e 's|@/components/Header|@/components/mom/Header|g' \
  -e 's|@/components/Spreadsheet|@/components/mom/Spreadsheet|g' \
  -e 's|@/components/Revision|@/components/mom/Revision|g' \
  -e 's|@/components/Companies|@/components/mom/Companies|g' \
  -e 's|@/components/Time|@/components/mom/Time|g' \
  -e 's|@/components/Hierarchical|@/components/mom/Hierarchical|g' \
  -e 's|@/components/View|@/components/mom/View|g' \
  -e 's|@/components/Image|@/components/mom/Image|g' \
  -e 's|@/components/PDF|@/components/mom/PDF|g' \
  -e 's|@/components/File|@/components/mom/File|g' \
  -e 's|@/components/Translation|@/components/mom/Translation|g' \
  -e 's|@/components/Status|@/components/mom/Status|g' \
  -e 's|@/components/Enhanced|@/components/mom/Enhanced|g' \
  -e 's|@/components/Responsible|@/components/mom/Responsible|g' \
  -e 's|@/components/Compact|@/components/mom/Compact|g' \
  -e 's|@/components/Tooltip|@/components/mom/Tooltip|g' \
  -e 's|@/components/Text|@/components/mom/Text|g' \
  {} +

# Fix API files
find ./app/api/mom ./app/api/translate* ./app/api/upload ./app/api/spreadsheet* ./app/api/companies ./app/api/attendees ./app/api/tasks -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's|@/lib/google-sheets|@/lib/mom/google-sheets|g' \
  -e 's|@/lib/google-drive|@/lib/mom/google-drive|g' \
  -e 's|@/lib/data-compression|@/lib/mom/data-compression|g' \
  -e 's|@/types|@/types/mom|g' \
  -e 's|@/services/translationService|@/services/mom/translationService|g' \
  {} +

# Fix lib files
find ./lib/mom -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's|@/types|@/types/mom|g' \
  {} +

# Fix services files
find ./services/mom -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's|@/types|@/types/mom|g' \
  -e 's|@/lib/google-sheets|@/lib/mom/google-sheets|g' \
  {} +

# Fix utils files
find ./utils/mom -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's|@/types|@/types/mom|g' \
  -e 's|@/lib/google-drive|@/lib/mom/google-drive|g' \
  {} +

# Fix contexts files
find ./contexts/mom -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' \
  -e 's|@/types|@/types/mom|g' \
  {} +

echo "Import paths fixed successfully!"