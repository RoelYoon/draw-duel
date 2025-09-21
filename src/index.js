const info = document.getElementById("break");
const profile = document.getElementById("profile");

const colorA = { r: 77, g: 176, b: 203 }; 
const colorB = { r: 197, g: 122, b: 64 };

animateTextColor(info, colorA, colorB, 3000);
animateTextColor(profile, colorB, colorA, 3000);

// To make it loop back and forth:
let isForward = false;
setInterval(() => {
  if (isForward) {
    animateTextColor(info, colorA, colorB, 3000);
    animateTextColor(profile, colorB, colorA, 3000);
  } else {
    animateTextColor(info, colorB, colorA, 3000);
    animateTextColor(profile, colorA, colorB, 3000);
  }
  isForward = !isForward;
}, 3000);

const roomList = document.getElementById('roomList');
const addRoomBtn = document.getElementById('addRoomBtn');

let roomCount = roomList.children.length;

const modal = document.getElementById('addRoomModal');
const cancelBtn = document.getElementById('cancelRoomBtn');
const createBtn = document.getElementById('createRoomBtn');
const roomNameInput = document.getElementById('roomNameInput');
const isPublicCheckbox = document.getElementById('isPublicCheckbox');
const passwordLabel = document.getElementById('passwordLabel');
const passwordInput = document.getElementById('passwordInput');

addRoomBtn.addEventListener('click', () => {
  roomNameInput.value = '';
  passwordInput.value = '';
  isPublicCheckbox.checked = true;
  passwordLabel.style.display = 'none';
  modal.style.display = 'flex';
});

cancelBtn.addEventListener('click', () => {
  modal.style.display = 'none';
});

isPublicCheckbox.addEventListener('change', () => {
  if (isPublicCheckbox.checked) {
    passwordLabel.style.display = 'none';
  } else {
    passwordLabel.style.display = 'block';
  }
});

createBtn.addEventListener('click', async () => {
  const name = roomNameInput.value.trim().toLowerCase();
  const isPublic = isPublicCheckbox.checked;
  const password = passwordInput.value;

  if (!name) {
    alert('Please enter your name.');
    return;
  }

  if (!isPublic && !password) {
    alert('Please enter a password for a private room.');
    return;
  }

  // Send to server
  try {
    const response = await fetch('/api/lobby', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name, isPublic, password})
    });
    if (!response.ok){throw new Error((await response.json()).error);}
    else{
        modal.style.display = 'none';
        window.location.href=`/battle.html?room=${encodeURIComponent(name)}&player=${encodeURIComponent(name)}`;
    }
  } catch (err) {
    alert(err.message);
  }
});

const refreshBtn = document.getElementById('refreshRoomsBtn');

const genModal = document.getElementById('genModal');
const genCancelBtn = document.getElementById('genCancelBtn');
const genInput = document.getElementById('genInput');
const genInputLabel = document.getElementById('genInputLabel');
const nameConfirmBtn = document.getElementById('nameConfirmBtn');
const passwordConfirmBtn = document.getElementById('passwordConfirmBtn');

genCancelBtn.addEventListener('click',()=>{
    genModal.style.display='none';
    passwordConfirmBtn.style.display='none';
    nameConfirmBtn.style.display='none';
});

async function loadRooms() {
  try{
    const response = await fetch('/api/lobby');
    if (!response.ok) throw new Error('Failed to fetch rooms');

    const lobby = await response.json({});
    // Clear current list
    roomList.innerHTML = '<p>...</p>';

    if(lobby) roomList.innerHTML='';

     
    // Add each room to UI
    for (const name in lobby) {
        const room = lobby[name];
        if(room.inBattle){continue;}
        const div = document.createElement('div');
        div.className = 'room';
        if(room.isPublic){
            div.innerHTML = `<span>${name}</span><button class="joinBtn">DUEL</button>`;
        }else{
            div.innerHTML = `<span>${name}</span><p><b><i>[PRIVATE]</i></b></p><button class="joinBtn">DUEL</button>`;
        }
        const joinBtn = div.querySelector('.joinBtn');
        joinBtn.addEventListener('click', async () => {
            const room = lobby[name];
            const postName = async () => {
                genInputLabel.innerText = `Username:`;
                genInput.value="";
                genModal.style.display = "flex";
                nameConfirmBtn.style.display='inline';
                nameConfirmBtn.onclick= () => {
                    const inputName = genInput.value.trim();
                    if(!inputName){
                        alert("Please enter your username");
                        return;
                    }else if(inputName===name){
                        alert("Room name exists in lobby");
                        return;
                    }
                    genModal.style.display = "none";
                    nameConfirmBtn.style.display='none';
                    // going to battle
                    window.location.href=`/battle.html?room=${encodeURIComponent(name)}&player=${encodeURIComponent(inputName)}`;
                };
            };
            if (!room.isPublic) {
                genInputLabel.innerHTML = `Password:`;
                genInput.value="";
                genModal.style.display = "flex";
                passwordConfirmBtn.style.display='inline';
                passwordConfirmBtn.onclick=async () => {
                    const password = genInput.value.trim();
                    if(password !== room.password){
                        alert('Wrong password!');
                        return;
                    }
                    genModal.style.display="none";
                    passwordConfirmBtn.style.display='none';

                    await postName();
                };            
            }else{
                await postName();
            }
        });
        roomList.appendChild(div);
    }
  }catch (err){
    alert(err.message);
  }
}

refreshBtn.addEventListener('click', loadRooms);
loadRooms();
