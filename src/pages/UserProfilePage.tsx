import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockEvents } from '../data/mockEvents';
import { Heart, Bell, Shield, Mail, User as UserIcon } from 'lucide-react';

export function UserProfilePage() {
  const [displayName, setDisplayName] = useState('Ji-Hoon Park');
  const [email] = useState('park.jihoon@designstudio.kr');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Notification settings
  const [eventReminders, setEventReminders] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [directMessages, setDirectMessages] = useState(true);

  // Interest tags
  const [interests] = useState(['Architectural Design', 'MICE Logistics', 'Smart Venues']);

  // Saved events
  const savedEvents = mockEvents.filter(e => e.isSaved).slice(0, 2);

  const handleSaveAccount = () => {
    alert('계정 정보가 저장되었습니다');
    setIsEditingProfile(false);
  };

  const handleDeactivate = () => {
    if (confirm('정말로 계정을 비활성화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      alert('계정이 비활성화되었습니다');
    }
  };

  return (
    <div className="user-profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-circle">
            <UserIcon size={48} />
          </div>
          <div className="avatar-badge">✓</div>
        </div>
        <div className="profile-info">
          <h1>{displayName}</h1>
          <p className="profile-title">Senior Exhibition Designer • Seoul, KR</p>
          <div className="profile-interests">
            {interests.map(interest => (
              <span key={interest} className="interest-tag">{interest}</span>
            ))}
            <button className="btn-add-interest">+ Add Interest</button>
          </div>
        </div>
        <div className="profile-actions">
          <button className="btn-edit-profile" onClick={() => setIsEditingProfile(!isEditingProfile)}>
            Edit Profile
          </button>
          <button className="btn-view-bio">View Public Bio</button>
        </div>
      </div>

      <div className="profile-content">
        {/* Main Content */}
        <div className="profile-main">
          {/* Saved Events */}
          <section className="profile-section">
            <div className="section-header">
              <h2><Heart size={24} /> Saved/Favorite Events</h2>
              <p className="section-subtitle">Events you're tracking for the 2024 season</p>
              <Link to="/" className="view-all-link">View All</Link>
            </div>
            <div className="saved-events-grid">
              {savedEvents.length === 0 ? (
                <p>저장된 행사가 없습니다</p>
              ) : (
                savedEvents.map(event => (
                  <Link key={event.id} to={`/event/${event.id}`} className="saved-event-card">
                    <img src={event.poster} alt={event.title} />
                    <button className="saved-event-heart">
                      <Heart size={20} fill="currentColor" />
                    </button>
                    <div className="saved-event-info">
                      <span className="saved-event-category">{event.category}</span>
                      <span className="saved-event-date">
                        {event.startDate.toISOString().slice(5, 10).replace('-', '.')}
                      </span>
                      <h3>{event.title}</h3>
                      <p><span style={{ marginRight: '4px' }}>📍</span>{event.venue}, {event.region}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          {/* Account Settings */}
          <section className="profile-section">
            <h2>Account Settings</h2>
            <div className="account-settings">
              <div className="setting-row">
                <label>
                  <Mail size={20} />
                  Email Address
                </label>
                <div className="setting-value">
                  {email}
                  <span className="verified-badge">✓</span>
                </div>
              </div>
              <div className="setting-row">
                <label>
                  <UserIcon size={20} />
                  Display Name
                </label>
                <div className="setting-value">
                  {isEditingProfile ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="setting-input"
                    />
                  ) : (
                    displayName
                  )}
                </div>
              </div>
              <div className="setting-row">
                <label>Current Password</label>
                <div className="setting-value">
                  ••••••••••••
                  <button className="btn-change">CHANGE</button>
                </div>
              </div>
              <div className="setting-actions">
                <button className="btn-cancel">Cancel Changes</button>
                <button className="btn-save" onClick={handleSaveAccount}>
                  Save Account Details
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="profile-sidebar">
          {/* Notifications */}
          <div className="sidebar-card">
            <h3><Bell size={20} /> Notifications</h3>
            <div className="notification-settings">
              <div className="notification-item">
                <div>
                  <h4>Event Reminders</h4>
                  <p>Before saved events start</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={eventReminders}
                    onChange={(e) => setEventReminders(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <div>
                  <h4>Marketing Emails</h4>
                  <p>Weekly curation of new shows</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={marketingEmails}
                    onChange={(e) => setMarketingEmails(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <div>
                  <h4>Direct Messages</h4>
                  <p>From exhibitors or organizers</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={directMessages}
                    onChange={(e) => setDirectMessages(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          {/* Security & Danger Zone */}
          <div className="sidebar-card danger-zone">
            <h3><Shield size={20} /> SECURITY & DANGER ZONE</h3>
            <p className="danger-warning">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <button className="btn-deactivate" onClick={handleDeactivate}>
              Deactivate Account
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
