import { Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger } from '@/components/ui/menubar'
import { type ActData, ROMAN, shortLocation } from './TextReader'

export function SceneNav({ acts, actNum, sceneNum, onGoTo }: {
  acts: ActData[]; actNum: number; sceneNum: number; onGoTo: (a: number, s: number) => void
}) {
  return (
    <Menubar>
      {acts.map(act => (
        <MenubarMenu key={act.num}>
          <MenubarTrigger className={actNum === act.num ? 'font-bold' : ''}>
            Act {ROMAN[act.num]}
          </MenubarTrigger>
          <MenubarContent>
            {act.scenes.map(scene => (
              <MenubarItem
                key={scene.num}
                onClick={() => onGoTo(act.num, scene.num)}
                className={actNum === act.num && sceneNum === scene.num ? 'font-bold' : ''}
              >
                <span className="mr-3">Sc. {scene.num}</span>
                {scene.location && <span className="text-muted-foreground text-xs">{shortLocation(scene.location)}</span>}
              </MenubarItem>
            ))}
          </MenubarContent>
        </MenubarMenu>
      ))}
    </Menubar>
  )
}
