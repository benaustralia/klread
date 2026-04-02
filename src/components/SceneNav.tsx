import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { type ActData, ROMAN, shortLocation } from './TextReader'

export function SceneNav({ acts, actNum, sceneNum, onGoTo }: {
  acts: ActData[]; actNum: number; sceneNum: number; onGoTo: (a: number, s: number) => void
}) {
  const currentScene = acts.find(a => a.num === actNum)?.scenes.find(s => s.num === sceneNum)
  const label = `Act ${ROMAN[actNum]} · Sc. ${sceneNum}${currentScene?.location ? ` — ${shortLocation(currentScene.location)}` : ''}`

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="noShadow" size="sm" className="font-mono text-xs max-w-xs truncate">
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[70vh] overflow-y-auto">
        {acts.map((act, i) => (
          <DropdownMenuGroup key={act.num}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>Act {ROMAN[act.num]}</DropdownMenuLabel>
            {act.scenes.map(scene => (
              <DropdownMenuItem
                key={scene.num}
                onClick={() => onGoTo(act.num, scene.num)}
                className={actNum === act.num && sceneNum === scene.num ? 'font-bold' : ''}
              >
                <span className="font-mono text-xs mr-3">Sc. {scene.num}</span>
                {scene.location && <span className="opacity-60 text-xs">{shortLocation(scene.location)}</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
