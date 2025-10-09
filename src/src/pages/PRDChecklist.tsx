import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useEffect, useMemo, useState } from "react";
import { parsePrdMarkdown, ChecklistGroup } from "@/utils/prdParser";

export default function PRDChecklist() {
  const [groups, setGroups] = useState<ChecklistGroup[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Import dinâmico do markdown como texto com ?raw
    import("../../docs/PRD_FinanceApp.md?raw")
      .then((mod: any) => {
        if (!isMounted) return;
        const md: string = mod.default || mod;
        const parsed = parsePrdMarkdown(md);
        setGroups(parsed);
      })
      .catch((e) => {
        if (!isMounted) return;
        setError("Não foi possível carregar o PRD.");
        // eslint-disable-next-line no-console
        console.error(e);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const { total, done, progress } = useMemo(() => {
    if (!groups) return { total: 0, done: 0, progress: 0 };
    const t = groups.reduce((acc, g) => acc + g.items.length, 0);
    const d = groups.reduce((acc, g) => acc + g.items.filter((i) => i.done).length, 0);
    const p = t > 0 ? Math.round((d / t) * 100) : 0;
    return { total: t, done: d, progress: p };
  }, [groups]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Checklist do PRD</h2>
          <p className="text-muted-foreground">Visualização rápida do status das funcionalidades</p>
        </div>
        <Badge variant={progress === 100 ? "default" : "secondary"}>{progress}%</Badge>
      </div>

      <div className="space-y-3">
        <Progress value={progress} className="h-2" />
        <div className="text-sm text-muted-foreground">
          {done} de {total} itens concluídos
        </div>
      </div>

      <Separator />

      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}

      {!groups && !error && (
        <div className="text-sm text-muted-foreground">Carregando PRD...</div>
      )}

      {groups && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
          <Card key={group.title} className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">{group.title}</CardTitle>
              <CardDescription>
                {group.items.filter((i) => i.done).length} / {group.items.length} concluídos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {group.items.map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    <Checkbox checked={item.done} disabled className="mt-0.5" />
                    <span className={item.done ? "line-through text-muted-foreground" : ""}>{item.label}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          ))}
        </div>
      )}
    </div>
  );
}


