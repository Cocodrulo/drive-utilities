function getRecentFolders() {
  const props = PropertiesService.getUserProperties();
  const data = props.getProperty('recentFolders');
  return data ? JSON.parse(data) : [];
}

function addRecentFolder(id, name) {
  if (!id) return;
  const list = getRecentFolders();
  const filtered = list.filter(f => f.id !== id);
  filtered.unshift({ id: id, name: name || id });
  if (filtered.length > 5) filtered.pop();
  PropertiesService.getUserProperties().setProperty('recentFolders', JSON.stringify(filtered));
}

function getFavoriteFolders() {
  const props = PropertiesService.getUserProperties();
  const data = props.getProperty('favoriteFolders');
  return data ? JSON.parse(data) : [];
}

function addFavoriteFolder(id, name) {
  if (!id) return;
  const list = getFavoriteFolders();
  if (list.some(f => f.id === id)) return;
  list.push({ id: id, name: name || id });
  PropertiesService.getUserProperties().setProperty('favoriteFolders', JSON.stringify(list));
}

function removeFavoriteFolder(id) {
  const list = getFavoriteFolders();
  const filtered = list.filter(f => f.id !== id);
  PropertiesService.getUserProperties().setProperty('favoriteFolders', JSON.stringify(filtered));
}

function getCopyHistory() {
  const props = PropertiesService.getUserProperties();
  const data = props.getProperty('copyHistory');
  return data ? JSON.parse(data) : [];
}

function addCopyHistoryEntry(msg) {
  const list = getCopyHistory();
  const timestamp = new Date().toLocaleString();
  list.unshift({ timestamp: timestamp, msg: msg });
  if (list.length > 5) list.pop();
  PropertiesService.getUserProperties().setProperty('copyHistory', JSON.stringify(list));
}

function selectFolderAction(e) {
  const folderId = e.parameters.folderId;
  const folderName = e.parameters.folderName;
  const itemsJson = e.parameters.itemsJson;
  const items = itemsJson ? JSON.parse(itemsJson) : [];

  saveFolderSelection(folderId, folderName);
  addRecentFolder(folderId, folderName);

  const mainCard = buildMainCard(e, items);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .build();
}

function pinFolderAction(e) {
  const folderId = e.parameters.folderId;
  const folderName = e.parameters.folderName;
  const itemsJson = e.parameters.itemsJson;
  const items = itemsJson ? JSON.parse(itemsJson) : [];

  addFavoriteFolder(folderId, folderName);

  const mainCard = buildMainCard(e, items);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .build();
}

function unpinFolderAction(e) {
  const folderId = e.parameters.folderId;
  const itemsJson = e.parameters.itemsJson;
  const items = itemsJson ? JSON.parse(itemsJson) : [];

  removeFavoriteFolder(folderId);

  const mainCard = buildMainCard(e, items);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .build();
}

function pinCurrentDestAction(e) {
  const itemsJson = e.parameters.itemsJson;
  const items = itemsJson ? JSON.parse(itemsJson) : [];
  
  const props = PropertiesService.getUserProperties();
  const destId = props.getProperty('destFolderId');
  const destName = props.getProperty('destFolderName');

  if (destId) {
    addFavoriteFolder(destId, destName);
    addRecentFolder(destId, destName);
  }

  const mainCard = buildMainCard(e, items);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .build();
}

function clearHistoryAction(e) {
  const itemsJson = e.parameters.itemsJson;
  const items = itemsJson ? JSON.parse(itemsJson) : [];

  PropertiesService.getUserProperties().deleteProperty('copyHistory');

  const mainCard = buildMainCard(e, items);
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(mainCard))
    .build();
}

function buildHistorySection(e, currentDestId, items) {
  const section = CardService.newCardSection()
    .setHeader(t('history.title'))
    .setCollapsible(true);

  const itemsJson = JSON.stringify(items);
  const favorites = getFavoriteFolders();
  const recents = getRecentFolders();
  const history = getCopyHistory();

  if (currentDestId && !favorites.some(f => f.id === currentDestId)) {
    section.addWidget(
      CardService.newTextButton()
        .setText(t('history.add_fav'))
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('pinCurrentDestAction')
            .setParameters({ itemsJson: itemsJson })
        )
    );
  }

  if (favorites.length > 0) {
    section.addWidget(CardService.newTextParagraph().setText('<b>' + t('history.favorites') + '</b>'));
    favorites.forEach(f => {
      section.addWidget(
        CardService.newDecoratedText()
          .setText(f.name)
          .setButton(
            CardService.newTextButton()
              .setText(t('history.unpin'))
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('unpinFolderAction')
                  .setParameters({ folderId: f.id, itemsJson: itemsJson })
              )
          )
          .setBottomLabel(f.id)
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('selectFolderAction')
              .setParameters({ folderId: f.id, folderName: f.name, itemsJson: itemsJson })
          )
      );
    });
  }

  if (recents.length > 0) {
    section.addWidget(CardService.newTextParagraph().setText('<b>' + t('history.recent') + '</b>'));
    recents.forEach(f => {
      const isFav = favorites.some(fav => fav.id === f.id);
      const button = isFav ? null : CardService.newTextButton()
        .setText(t('history.pin'))
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('pinFolderAction')
            .setParameters({ folderId: f.id, folderName: f.name, itemsJson: itemsJson })
        );

      const widget = CardService.newDecoratedText()
        .setText(f.name)
        .setBottomLabel(f.id)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('selectFolderAction')
            .setParameters({ folderId: f.id, folderName: f.name, itemsJson: itemsJson })
        );

      if (button) {
        widget.setButton(button);
      }
      section.addWidget(widget);
    });
  }

  section.addWidget(CardService.newTextParagraph().setText('<b>' + t('history.history_title') + '</b>'));
  if (history.length === 0) {
    section.addWidget(CardService.newTextParagraph().setText(t('history.no_history')));
  } else {
    history.forEach(h => {
      section.addWidget(
        CardService.newDecoratedText()
          .setText(h.timestamp)
          .setBottomLabel(h.msg)
      );
    });
    section.addWidget(
      CardService.newTextButton()
        .setText(t('history.clear_history'))
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('clearHistoryAction')
            .setParameters({ itemsJson: itemsJson })
        )
    );
  }

  return section;
}
