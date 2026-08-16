import fs from 'node:fs';

const file = 'src/components/ChatsView.tsx';
const source = fs.readFileSync(file, 'utf8');
const fixed = source.replaceAll('https://t.me/Rubby_Chan_Bot', 'https://t.me/RubbyChanbot');
if (fixed !== source) fs.writeFileSync(file, fixed);
