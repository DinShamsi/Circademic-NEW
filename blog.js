import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    collection, 
    getDocs, 
    addDoc,
    deleteDoc,
    doc,
    getDoc,
    orderBy,
    query,
    limit
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

let currentUser = null;
let isWriter = false;

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        await checkWriterStatus();
        loadBlogPosts();
    } else {
        loadBlogPosts();
    }
});

// Check if user is writer
async function checkWriterStatus() {
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            isWriter = userDoc.data().isWriter || false;
            if (isWriter) {
                document.getElementById('writerActions').style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error checking writer status:', error);
    }
}

// Load blog posts
async function loadBlogPosts() {
    try {
        const postsRef = collection(db, 'blogPosts');
        const q = query(postsRef, orderBy('createdAt', 'desc'), limit(20));
        const snapshot = await getDocs(q);
        
        const blogGrid = document.getElementById('blogGrid');
        const blogEmpty = document.getElementById('blogEmpty');
        
        if (snapshot.empty) {
            blogGrid.style.display = 'none';
            blogEmpty.style.display = 'block';
            return;
        }
        
        blogGrid.innerHTML = '';
        blogEmpty.style.display = 'none';
        
        snapshot.forEach(doc => {
            const post = doc.data();
            const postElement = createPostElement(doc.id, post);
            blogGrid.appendChild(postElement);
        });
    } catch (error) {
        console.error('Error loading blog posts:', error);
    }
}

// Create post element
function createPostElement(postId, post) {
    const div = document.createElement('div');
    div.className = 'blog-post';
    
    const date = post.createdAt ? new Date(post.createdAt).toLocaleDateString('he-IL') : '';
    
    div.innerHTML = `
        <div class="blog-post-image">📝</div>
        <div class="blog-post-content">
            <div class="blog-post-date">${date}</div>
            <h3 class="blog-post-title">${post.title}</h3>
            <p class="blog-post-summary">${post.summary}</p>
            ${isWriter ? `
                <div class="blog-post-actions">
                    <button onclick="editPost('${postId}')" style="background: var(--primary); color: white;">ערוך</button>
                    <button onclick="deletePost('${postId}')" style="background: var(--danger); color: white;">מחק</button>
                </div>
            ` : ''}
        </div>
    `;
    
    div.onclick = (e) => {
        if (!e.target.closest('.blog-post-actions')) {
            showPostDetails(post);
        }
    };
    
    return div;
}

// Show post details
function showPostDetails(post) {
    alert(`${post.title}\n\n${post.content}`);
}

// Show new post form
window.showNewPostForm = () => {
    document.getElementById('newPostModal').classList.add('active');
};

window.closePostModal = () => {
    document.getElementById('newPostModal').classList.remove('active');
};

// Handle new post form
const newPostForm = document.getElementById('newPostForm');
if (newPostForm) {
    newPostForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const postData = {
            title: document.getElementById('postTitle').value,
            summary: document.getElementById('postSummary').value,
            content: document.getElementById('postContent').value,
            author: currentUser.uid,
            authorName: currentUser.displayName || currentUser.email,
            createdAt: new Date().toISOString()
        };
        
        try {
            await addDoc(collection(db, 'blogPosts'), postData);
            closePostModal();
            newPostForm.reset();
            loadBlogPosts();
            showMessage('הפוסט פורסם בהצלחה!', 'success');
        } catch (error) {
            console.error('Error creating post:', error);
            showMessage('שגיאה בפרסום הפוסט', 'error');
        }
    });
}

// Delete post
window.deletePost = async (postId) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק את הפוסט?')) return;
    
    try {
        await deleteDoc(doc(db, 'blogPosts', postId));
        loadBlogPosts();
        showMessage('הפוסט נמחק בהצלחה!', 'success');
    } catch (error) {
        console.error('Error deleting post:', error);
        showMessage('שגיאה במחיקת הפוסט', 'error');
    }
};

// Show message
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 2rem;
        border-radius: 10px;
        font-weight: 600;
        z-index: 9999;
        ${type === 'success' ? 'background: #10b981; color: white;' : 'background: #ef4444; color: white;'}
    `;
    document.body.appendChild(messageDiv);
    setTimeout(() => messageDiv.remove(), 3000);
}
