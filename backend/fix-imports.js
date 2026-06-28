const fs = require('fs');
let code = fs.readFileSync('src/components/LeadsTable.tsx', 'utf8');

// The file currently has duplicated imports at the top
code = code.replace(/import { toast } from "sonner";\r?\nimport { Lead } from "@\/types\/lead";\r?\nimport \{\r?\nimport { toast } from "sonner";\r?\nimport { Lead } from "@\/types\/lead";\r?\nimport \{/, 'import { toast } from "sonner";\nimport { Lead } from "@/types/lead";\nimport {');

code = code.replace('import { Input } from "@/components/ui/input";\r\n\r\ninterface Props', 'import { Input } from "@/components/ui/input";\nimport { Textarea } from "@/components/ui/textarea";\nimport { Badge } from "@/components/ui/badge";\n\ninterface Props');

fs.writeFileSync('src/components/LeadsTable.tsx', code);
console.log("Fixed top level imports");
