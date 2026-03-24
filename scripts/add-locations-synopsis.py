"""Adds synopsis (top-level) and location + sceneSynopsis to each scene."""
import json

SYNOPSIS = (
    "King Lear dramatizes the story of an aged king of ancient Britain, whose plan to divide his "
    "kingdom among his three daughters ends tragically. When he tests each by asking how much she "
    "loves him, the older daughters, Goneril and Regan, flatter him. The youngest, Cordelia, does "
    "not, and Lear disowns and banishes her. She marries the king of France. Goneril and Regan turn "
    "on Lear, leaving him to wander madly in a furious storm. Meanwhile, the Earl of Gloucester's "
    "illegitimate son Edmund turns Gloucester against his legitimate son, Edgar. Gloucester, appalled "
    "at the daughters' treatment of Lear, gets news that a French army is coming to help Lear. Edmund "
    "betrays Gloucester to Regan and her husband, Cornwall, who puts out Gloucester's eyes and makes "
    "Edmund the Earl of Gloucester. Cordelia and the French army save Lear, but the army is defeated. "
    "Edmund imprisons Cordelia and Lear. Edgar then mortally wounds Edmund in a trial by combat. Dying, "
    "Edmund confesses that he has ordered the deaths of Cordelia and Lear. Before they can be rescued, "
    "Lear brings in Cordelia's body and then he himself dies."
)

SCENES = {
    (1,1): ("King Lear's palace", "Lear divides his kingdom among his daughters based on declarations of love; Cordelia refuses to flatter him and is disinherited, and Kent is banished for defending her. France takes Cordelia as his queen."),
    (1,2): ("The Earl of Gloucester's castle", "Edmund tricks his father Gloucester into believing his legitimate brother Edgar is plotting against him, and separately convinces Edgar he is in danger from their father."),
    (1,3): ("The Duke of Albany's palace", "Goneril, irritated by Lear's riotous knights, instructs her steward Oswald to treat Lear and his men with deliberate disrespect."),
    (1,4): ("The Duke of Albany's palace", "Kent returns in disguise and enters Lear's service; the Fool makes his first appearance and mocks Lear's folly. Goneril confronts Lear and demands he halve his retinue; Lear curses her and departs for Regan."),
    (1,5): ("Before the Duke of Albany's palace", "Lear sends Kent ahead with a letter to Regan; the Fool continues to taunt Lear about his foolishness, and Lear begins to fear for his sanity."),
    (2,1): ("The Earl of Gloucester's castle", "Edmund stages a false confrontation with Edgar to convince Gloucester of Edgar's treachery; Edgar flees and is outlawed. Cornwall and Regan arrive and take Edmund into their service."),
    (2,2): ("Before the Earl of Gloucester's castle", "Kent quarrels with and beats Oswald; Cornwall and Regan have Kent put in the stocks as an insult to Lear."),
    (2,3): ("The open country", "Edgar, hunted as an outlaw, resolves to disguise himself as a mad beggar named Poor Tom."),
    (2,4): ("Before the Earl of Gloucester's castle", "Lear finds Kent in the stocks and is progressively humiliated as both Regan and Goneril refuse to house any of his knights. Stripped of his retinue, Lear rushes out into a gathering storm."),
    (3,1): ("The heath", "A storm rages; Kent learns from a Gentleman that Lear is wandering the heath with only his Fool, and that there is a secret rift between Albany and Cornwall. Kent sends the Gentleman to Dover to alert Cordelia."),
    (3,2): ("The heath", "Lear rages against the storm, descending toward madness while the Fool tries to coax him to shelter; Kent finds them and leads them toward a hovel."),
    (3,3): ("Gloucester's castle", "Gloucester confides to Edmund that he has received a letter about a French invasion and intends to help Lear; Edmund immediately resolves to betray him to Cornwall."),
    (3,4): ("The heath. Before a hovel", "Lear and the Fool take shelter in a hovel and encounter Edgar disguised as Poor Tom; Lear, fascinated by the supposed mad beggar, begins to strip off his clothes. Gloucester arrives to guide them to safety."),
    (3,5): ("Gloucester's castle", "Edmund delivers Gloucester's treasonous letter to Cornwall, who resolves to arrest Gloucester; Edmund is made the new Earl of Gloucester."),
    (3,6): ("A farmhouse near Gloucester's castle", "In a farmhouse shelter, Lear stages a mock trial of his daughters using Edgar, the Fool, and Kent as judges; his madness is now fully apparent. Gloucester warns Kent to flee with Lear toward Dover."),
    (3,7): ("Gloucester's castle", "Cornwall, urged on by Regan, interrogates Gloucester and has his eyes put out; a servant fatally wounds Cornwall before being killed. Gloucester, blinded, is thrust out and told to smell his way to Dover."),
    (4,1): ("The heath", "Edgar encounters his blind, wandering father Gloucester, who does not recognise him; Gloucester asks to be guided to Dover, where he intends to end his life at the cliffs."),
    (4,2): ("Before the Duke of Albany's palace", "Goneril and Edmund arrive at Albany's palace; Albany confronts Goneril over the treatment of Lear and the blinding of Gloucester. News arrives that Cornwall has died from his wound."),
    (4,3): ("The French camp near Dover", "Kent learns from a Gentleman that Cordelia has received his letters and wept; Lear, ashamed, refuses to see her even though she is nearby."),
    (4,4): ("The French camp near Dover", "Cordelia sends soldiers to find Lear, who has been seen wandering crowned with wild flowers; a messenger brings word that the British armies are advancing."),
    (4,5): ("Gloucester's castle", "Regan questions Oswald about Goneril's letters to Edmund, revealing her own interest in him; she asks Oswald to kill Gloucester if he finds him."),
    (4,6): ("The country near Dover", "Edgar leads blind Gloucester to what he pretends is Dover cliff; Gloucester attempts suicide but survives. Lear enters raving in a wild flower crown; Edgar kills Oswald and discovers Goneril's treasonous letter to Edmund."),
    (4,7): ("A tent in the French camp near Dover", "Cordelia is reunited with a sleeping Lear; he wakes, confused and penitent, and she comforts him. A battle against the British forces is imminent."),
    (5,1): ("The British camp near Dover", "Edmund and Albany prepare for battle; Edgar, still disguised, gives Albany Goneril's treasonous letter. Edmund privately resolves to show no mercy to Lear and Cordelia."),
    (5,2): ("A field between the two camps", "Battle is joined and quickly over; the French forces are defeated and Lear and Cordelia are captured."),
    (5,3): ("The British camp near Dover", "Edmund sends Lear and Cordelia to prison with a secret order for their execution. Edgar mortally wounds Edmund; Goneril poisons Regan and kills herself. The death order comes too late — Cordelia has been hanged. Lear enters carrying her body and dies of grief."),
}

with open('src/data/king-lear.json') as f:
    data = json.load(f)

data['synopsis'] = SYNOPSIS

for act in data['acts']:
    for scene in act['scenes']:
        key = (act['num'], scene['num'])
        if key in SCENES:
            scene['location'], scene['synopsis'] = SCENES[key]

with open('src/data/king-lear.json', 'w') as f:
    json.dump(data, f, indent=2)

print(f"Done — synopsis added, {len(SCENES)} scenes annotated")
