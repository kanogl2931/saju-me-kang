import './App.css'
import AppHeader from './components/layout/AppHeader'
import AuthLoadingScreen from './components/layout/AuthLoadingScreen'
import UserBar from './components/layout/UserBar'
import ReadingsSidebar from './components/layout/ReadingsSidebar'
import ProfileModal from './components/profile/ProfileModal'
import ProfileSummary from './components/profile/ProfileSummary'
import SajuForm from './components/form/SajuForm'
import ChartSection from './components/chart/ChartSection'
import InterpretationSection from './components/result/InterpretationSection'
import LoadingCat from './components/result/LoadingCat'
import SavedResultPanel from './components/result/SavedResultPanel'
import { trackEvent } from './services/analytics'
import { useSajuApp } from './hooks/useSajuApp'

function App() {
  const app = useSajuApp()

  if (app.isBootstrapping) {
    return <AuthLoadingScreen />
  }

  return (
    <div className="app-shell">
      {app.isLoggedIn && (
        <ProfileModal
          open={app.showProfileModal}
          required={app.isProfileRequired}
          initialProfile={app.profile}
          defaultName={app.googleDefaultName}
          onSave={app.handleSaveProfile}
          onClose={() => {
            if (!app.isProfileRequired) app.setShowProfileModal(false)
          }}
        />
      )}

      {app.isLoggedIn && (
        <ReadingsSidebar
          isOpen={app.isSidebarOpen}
          readings={app.readings}
          selectedId={app.selectedId}
          hasSeenSajuResult={app.hasSeenSajuResult}
          onToggle={() => {
            app.setIsSidebarOpen((open) => {
              const next = !open
              trackEvent('sidebar_toggle', { action: next ? 'open' : 'close' })
              return next
            })
          }}
          onClose={() => app.setIsSidebarOpen(false)}
          onNewSaju={app.handleNewSaju}
          onSelectReading={app.handleSelectReading}
          onDeleteReading={app.handleDeleteReading}
        />
      )}

      <div className="app">
        <UserBar
          isLoggedIn={app.isLoggedIn}
          userLabel={app.userLabel}
          profile={app.profile}
          isSigningIn={app.isSigningIn}
          onOpenProfile={app.openProfileEditor}
          onSignOut={app.handleSignOut}
          onSignIn={() => app.handleGoogleSignIn('header')}
        />

        <AppHeader
          isEditingSaved={app.isEditingSaved}
          isLoggedIn={app.isLoggedIn}
          profile={app.profile}
          generationCount={app.generationCount}
          hasSeenSajuResult={app.hasSeenSajuResult}
          onNewSaju={app.handleNewSaju}
        />

        {app.isLoggedIn && app.profile && !app.isViewingSaved && (
          <ProfileSummary profile={app.profile} onEdit={app.openProfileEditor} />
        )}

        {app.isViewingSaved && (app.sajuChart || app.result) && (
          <SavedResultPanel
            resultRef={app.resultRef}
            isSharedView={app.isSharedView}
            name={app.name}
            birthDate={app.birthDate}
            birthTime={app.birthTime}
            gender={app.gender}
            calendarType={app.calendarType}
            pillars={app.pillars}
            chartRows={app.chartRows}
            sajuChart={app.sajuChart}
            previewResult={app.previewResult}
            isSharing={app.isSharing}
            result={app.result}
            shareMessage={app.shareMessage}
            hasSeenSajuResult={app.hasSeenSajuResult}
            isSigningIn={app.isSigningIn}
            authError={app.authError}
            onLogin={() => app.handleGoogleSignIn('result_gate')}
            onShare={app.handleShareResult}
            onEdit={app.startEditSaved}
            onNewSaju={app.handleNewSaju}
          />
        )}

        <SajuForm
          isViewingSaved={app.isViewingSaved}
          isLoading={app.isLoading}
          isEditingSaved={app.isEditingSaved}
          isFormComplete={app.isFormComplete}
          name={app.name}
          birthYear={app.birthYear}
          birthMonth={app.birthMonth}
          birthDay={app.birthDay}
          birthHour={app.birthHour}
          birthMinute={app.birthMinute}
          gender={app.gender}
          calendarType={app.calendarType}
          years={app.years}
          months={app.months}
          days={app.days}
          hours={app.hours}
          minutes={app.minutes}
          onNameChange={app.setName}
          onBirthYearChange={app.setBirthYear}
          onBirthMonthChange={app.setBirthMonth}
          onDayChange={app.handleDayChange}
          onBirthHourChange={app.setBirthHour}
          onBirthMinuteChange={app.setBirthMinute}
          onGenderChange={app.setGender}
          onCalendarTypeChange={app.setCalendarType}
          onSubmit={app.handleSubmit}
        />

        {(app.error || app.authError) && (
          <p className="error-message">{app.error || app.authError}</p>
        )}

        {app.isLoading && <LoadingCat />}

        {!app.isViewingSaved && !app.isLoading && app.sajuChart && (
          <ChartSection
            resultRef={app.resultRef}
            pillars={app.pillars}
            chartRows={app.chartRows}
            sajuChart={app.sajuChart}
          />
        )}

        {!app.isViewingSaved && !app.isLoading && app.result && (
          <InterpretationSection
            name={app.name}
            previewResult={app.previewResult}
            isSharing={app.isSharing}
            shareMessage={app.shareMessage}
            isSigningIn={app.isSigningIn}
            authError={app.authError}
            onLogin={() => app.handleGoogleSignIn('result_gate')}
            onShare={app.handleShareResult}
          />
        )}
      </div>
    </div>
  )
}

export default App
