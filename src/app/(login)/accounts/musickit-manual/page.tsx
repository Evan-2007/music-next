'use client';

export default function MusicKitManual() {
    function handleSubmit(event: React.FormEvent) {
        event.preventDefault();
        const form = event.target as HTMLFormElement;
        const input = form.elements[0] as HTMLInputElement;
        const token = input.value;
        if (typeof window !== 'undefined' && (window as any).MusicKit) {
            document.cookie = `music.q222xnn59b.media-user-token=${encodeURIComponent(token)}; path=/`;
            localStorage.setItem('music.q222xnn59b.media-user-token', token);
            console.log('Music User Token set:', token);
            alert('Music User Token set successfully!');
        } else {
            alert('MusicKit is not available.');
        }
    }
    return (
        <div className='flex h-full w-full flex-col items-center justify-center'>
            <form onSubmit={handleSubmit} className='flex flex-col items-center'>
                <input type="text" placeholder="media-user-token" className="input-bordered input w-96" />
                <button type="submit" className="btn-primary btn ml-4">Submit</button>
            </form>
        </div>
    );
}