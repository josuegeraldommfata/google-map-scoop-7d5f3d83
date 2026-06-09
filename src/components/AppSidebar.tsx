import { Crosshair, Search, BarChart3, History, Trash2 } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

interface Props {
  active: 'search' | 'metrics' | 'history';
  onChange: (v: 'search' | 'metrics' | 'history') => void;
  onClear: () => void;
  totalLeads: number;
}

export function AppSidebar({ active, onChange, onClear, totalLeads }: Props) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const items = [
    { key: 'search', label: 'Buscar Leads', icon: Search },
    { key: 'metrics', label: 'Métricas', icon: BarChart3 },
    { key: 'history', label: 'Histórico', icon: History },
  ] as const;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="p-2 rounded-lg bg-sidebar-primary/15">
            <Crosshair className="w-5 h-5 text-sidebar-primary" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-display text-lg leading-none text-sidebar-foreground">Leads Hunter</p>
              <p className="text-[10px] text-sidebar-foreground/60 uppercase tracking-widest mt-1">Editorial</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(it => (
                <SidebarMenuItem key={it.key}>
                  <SidebarMenuButton
                    isActive={active === it.key}
                    onClick={() => onChange(it.key)}
                    className="cursor-pointer"
                  >
                    <it.icon className="h-4 w-4" />
                    {!collapsed && <span>{it.label}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {!collapsed && (
          <div className="px-3 py-2">
            <p className="text-[10px] uppercase tracking-widest text-sidebar-foreground/50">Sessão</p>
            <p className="font-display text-2xl text-sidebar-foreground">{totalLeads}</p>
            <p className="text-[11px] text-sidebar-foreground/60 -mt-1">leads salvos</p>
          </div>
        )}
        <button
          onClick={onClear}
          className="mx-2 mb-2 flex items-center gap-2 px-2 py-2 rounded-md text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          title="Limpar todos os leads salvos"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {!collapsed && 'Limpar dados'}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
