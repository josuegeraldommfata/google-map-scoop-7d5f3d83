import fs from 'fs';

const original = fs.readFileSync('./src/pages/Index.tsx', 'utf8');

let updated = original.replace(
  "import { MetricsView } from \"@/components/MetricsView\";",
  "import { MetricsView } from \"@/components/MetricsView\";\nimport { CrmKanban } from \"@/components/CrmKanban\";"
);

updated = updated.replace(
  "type View = 'search' | 'metrics' | 'history';",
  "type View = 'search' | 'metrics' | 'history' | 'crm';"
);

updated = updated.replace(
  "{view === 'history' && 'Histórico de Buscas'}",
  "{view === 'history' && 'Histórico de Buscas'}\n                {view === 'crm' && 'Meu Funil'}"
);

updated = updated.replace(
  "{view === 'history' && (",
  "{view === 'crm' && <CrmKanban />}\n\n              {view === 'history' && ("
);

fs.writeFileSync('./src/pages/Index.tsx', updated);
console.log('Index.tsx updated!');
