function onDriveHomepage(e) {
  return buildMainCard(e, []);
}

function onItemsSelected(e) {
  const items = e.drive.selectedItems || [];
  return buildMainCard(e, items);
}

function onDriveItemsOpened(e) {
  const items = e.drive.selectedItems || [];
  return buildMainCard(e, items);
}

function buildMainCard(e, items) {
  const userProps = PropertiesService.getUserProperties();
  const destId   = userProps.getProperty('destFolderId');
  const destName = userProps.getProperty('destFolderName');

  const card = CardService.newCardBuilder()
    .setName('main')
    .setHeader(
      CardService.newCardHeader()
        .setTitle('Drive Copy')
        .setSubtitle(t('main.subtitle'))
        .setImageUrl('https://i.ibb.co/chL0tHXs/image.png')
    );

  const itemSection = CardService.newCardSection()
    .setHeader(t('main.selected_items'));

  if (items.length === 0) {
    itemSection.addWidget(
      CardService.newTextParagraph().setText(
        t('main.no_items')
      )
    );
  } else {
    items.forEach(item => {
      const icon = item.mimeType === 'application/vnd.google-apps.folder'
        ? '📁' : '📄';
      itemSection.addWidget(
        CardService.newDecoratedText()
          .setTopLabel(icon + ' ' + item.title)
          .setText(item.id)
          .setWrapText(false)
      );
    });
  }
  card.addSection(itemSection);

  const destSection = CardService.newCardSection()
    .setHeader(t('main.dest_folder'));

  const destLabel = destId
    ? '📁 ' + (destName || destId)
    : t('main.dest_folder_default');

  destSection.addWidget(
    CardService.newDecoratedText()
      .setTopLabel(t('main.current_dest'))
      .setText(destLabel)
  );

  destSection.addWidget(
    CardService.newTextButton()
      .setText(t('main.select_dest_folder'))
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('openPickerAndPrepare')
          .setParameters({ itemsJson: JSON.stringify(items) })
      )
  );

  if (destId) {
    destSection.addWidget(
      CardService.newTextButton()
        .setText(t('main.use_source_folder_default'))
        .setOnClickAction(
          CardService.newAction().setFunctionName('clearDestFolder')
        )
    );
  }

  card.addSection(destSection);

  if (items.length > 0) {
    const actionSection = CardService.newCardSection();

    const itemsJson = JSON.stringify(
      items.map(i => ({ id: i.id, title: i.title, mimeType: i.mimeType }))
    );

    actionSection.addWidget(
      CardService.newTextButton()
        .setText(t('main.copy_now'))
        .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('executeCopy')
            .setParameters({ itemsJson: itemsJson })
        )
    );

    card.addSection(actionSection);
  }

  return card.build();
}

function clearDestFolder(e) {
  PropertiesService.getUserProperties().deleteProperty('destFolderId');
  PropertiesService.getUserProperties().deleteProperty('destFolderName');
  
  let items = [];
  if (e.parameters && e.parameters.itemsJson) {
    items = JSON.parse(e.parameters.itemsJson);
  }

  const tarjetaLimpia = buildMainCard(e, items);

  return CardService.newActionResponseBuilder()
    .setNotification(
      CardService.newNotification().setText(t('main.dest_folder_restored'))
    )
    .setNavigation(
      CardService.newNavigation().updateCard(tarjetaLimpia)
    )
    .build();
}

function executeCopy(e) {
  const params    = e.parameters;
  const items     = JSON.parse(params.itemsJson);
  const userProps = PropertiesService.getUserProperties();
  const destId    = userProps.getProperty('destFolderId');

  const results = [];
  const errors  = [];

  items.forEach(item => {
    try {
      let targetFolderId = destId;

      if (!targetFolderId) {
        targetFolderId = getParentFolderId(item.id, item.mimeType);
      }

      if (item.mimeType === 'application/vnd.google-apps.folder') {
        const destFolder = DriveApp.getFolderById(targetFolderId);
        const newName = getSafeName(item.title, destFolder, true);
        copyFolder(item.id, destFolder, newName);
        results.push('📁 ' + newName);
      } else {
        const destFolder = DriveApp.getFolderById(targetFolderId);
        const newName = getSafeName(item.title, destFolder, false);
        
        const resource = {
          title: newName,
          parents: [{ id: targetFolderId }]
        };
        
        Drive.Files.copy(resource, item.id);
        results.push('📄 ' + newName);
      }
    } catch (err) {
      errors.push(item.title + ': ' + err.message);
    }
  });

  let msg = '';
  if (results.length > 0) msg += t('main.copied', { count: results.length }) + '\n' + results.join('\n');
  if (errors.length  > 0) msg += '\n❌ ' + t('main.errors') + '\n' + errors.join('\n');

  const resultCard = CardService.newCardBuilder()
    .setName('result')
    .setHeader(CardService.newCardHeader().setTitle(t('main.copy_result')))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(msg))
        .addWidget(
          CardService.newTextButton()
            .setText(t('main.back'))
            .setOnClickAction(CardService.newAction().setFunctionName('goBack'))
        )
    )
    .build();

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().pushCard(resultCard))
    .build();
}

function goBack(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().popCard())
    .build();
}

function copyFolder(sourceFolderId, destParent, newName) {
  const sourceFolder = DriveApp.getFolderById(sourceFolderId);
  const newFolder    = destParent.createFolder(newName);

  const files = sourceFolder.getFiles();
  while (files.hasNext()) {
    const file    = files.next();
    const safeName = getSafeName(file.getName(), newFolder, false);
    file.makeCopy(safeName, newFolder);
  }

  const subFolders = sourceFolder.getFolders();
  while (subFolders.hasNext()) {
    const sub     = subFolders.next();
    const safeName = getSafeName(sub.getName(), newFolder, true);
    copyFolder(sub.getId(), newFolder, safeName);
  }
}

function getSafeName(originalName, parentFolder, isFolder) {
  let name    = originalName;
  let counter = 0;

  while (nameExistsInFolder(name, parentFolder, isFolder)) {
    counter++;
    name = originalName + ' - copy' + (counter > 1 ? ' ' + counter : '');
  }

  return name;
}

function nameExistsInFolder(name, folder, isFolder) {
  if (isFolder) {
    const iter = folder.getFoldersByName(name);
    return iter.hasNext();
  } else {
    const iter = folder.getFilesByName(name);
    return iter.hasNext();
  }
}

function getParentFolderId(itemId, mimeType) {
  try {
    if (mimeType === 'application/vnd.google-apps.folder') {
      const folder  = DriveApp.getFolderById(itemId);
      const parents = folder.getParents();
      if (parents.hasNext()) return parents.next().getId();
    } else {
      const file    = DriveApp.getFileById(itemId);
      const parents = file.getParents();
      if (parents.hasNext()) return parents.next().getId();
    }
  } catch (err) {}
  return DriveApp.getRootFolder().getId();
}

function getPickerUrl() {
  // return `${ScriptApp.getService().getUrl()}?page=picker`;
  return 'https://script.google.com/macros/s/AKfycbymGig4e7Mza9Hr9-0zo-ra2QSzMMh9foeTEGpK-6_D/dev?page=picker'
}

function saveFolderSelection(folderId, folderName) {
  const props = PropertiesService.getUserProperties();
  props.setProperty('destFolderId', folderId);
  props.setProperty('destFolderName', folderName);
}

function doGet(e) {
  if (e.parameter.page === 'picker') {
    return HtmlService.createTemplateFromFile('Picker')
      .evaluate()
      .setTitle(t('picker.title'))
      .setSandboxMode(HtmlService.SandboxMode.IFRAME);
  }
  
  if (e.parameter.folderId) {
    saveFolderSelection(e.parameter.folderId, e.parameter.folderName || e.parameter.folderId);
    return HtmlService.createHtmlOutput(`<p>${t('picker.folder_selected')}</p>`);
  }
  
  return HtmlService.createHtmlOutput(`<p>${t('picker.running')}</p>`);
}

function openPickerAndPrepare(e) {
  const itemsJson = e.parameters.itemsJson;
  
  const nav = CardService.newNavigation().pushCard(buildWaitingCard(itemsJson));
  
  const openLink = CardService.newOpenLink()
      .setUrl(getPickerUrl())
      .setOpenAs(CardService.OpenAs.OVERLAY);

  return CardService.newActionResponseBuilder()
      .setNavigation(nav)
      .setOpenLink(openLink)
      .build();
}

function buildWaitingCard(itemsJson) {
  return CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader().setTitle(t('main.waiting')))
    .addSection(
      CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText(t('main.waiting_text')))
        .addWidget(
          CardService.newTextButton()
            .setText(t('main.confirm_and_view'))
            .setTextButtonStyle(CardService.TextButtonStyle.FILLED)
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('finalRefresh')
                .setParameters({ itemsJson: itemsJson })
            )
        )
    )
    .build();
}

function finalRefresh(e) {
  const items = JSON.parse(e.parameters.itemsJson);
  
  return CardService.newActionResponseBuilder()
      .setNavigation(
        CardService.newNavigation().popToRoot().updateCard(buildMainCard(e, items))
      )
      .build();
}
