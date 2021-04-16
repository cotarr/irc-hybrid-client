// ---------------------------------------------
// webclient5.js Notice and WallOps functions
// ---------------------------------------------

// -------------------------------------
// Notice Close Buttons
// -------------------------------------
document.getElementById('closeNoticeButton').addEventListener('click', function() {
  webState.noticeOpen = false;
  updateDivVisibility();
}.bind(this));

// -------------------------
// Notice Clear button handler
// -------------------------
document.getElementById('noticeClearButton').addEventListener('click', function() {
  document.getElementById('noticeMessageDisplay').textContent = '';
  document.getElementById('noticeMessageDisplay').setAttribute('rows', '5');
});

// -------------------------
// Notice Taller button handler
// -------------------------
document.getElementById('noticeTallerButton').addEventListener('click', function() {
  let newRows =
    parseInt(document.getElementById('noticeMessageDisplay').getAttribute('rows')) + 5;
  document.getElementById('noticeMessageDisplay').setAttribute('rows', newRows.toString());
}.bind(this));

// -------------------------
// Notice Normal button handler
// -------------------------
document.getElementById('noticeNormalButton').addEventListener('click', function() {
  document.getElementById('noticeMessageDisplay').setAttribute('rows', '5');
}.bind(this));

// -------------------------------------
// Wallops Close Buttons
// -------------------------------------
document.getElementById('wallopsCloseButton').addEventListener('click', function() {
  webState.wallopsOpen = false;
  updateDivVisibility();
}.bind(this));

// -------------------------
// Wallops Clear button handler
// -------------------------
document.getElementById('wallopsClearButton').addEventListener('click', function() {
  document.getElementById('wallopsMessageDisplay').textContent = '';
  document.getElementById('wallopsMessageDisplay').setAttribute('rows', '5');
}.bind(this));

// -------------------------
// Wallops Taller button handler
// -------------------------
document.getElementById('wallopsTallerButton').addEventListener('click', function() {
  let newRows =
    parseInt(document.getElementById('wallopsMessageDisplay').getAttribute('rows')) + 5;
  document.getElementById('wallopsMessageDisplay').setAttribute('rows', newRows.toString());
}.bind(this));

// -------------------------
// Wallops Normal button handler
// -------------------------
document.getElementById('wallopsNormalButton').addEventListener('click', function() {
  document.getElementById('wallopsMessageDisplay').setAttribute('rows', '5');
}.bind(this));
