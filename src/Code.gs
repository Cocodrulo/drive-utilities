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

  const itemsJson = JSON.stringify(
    items.map(i => ({ id: i.id, title: i.title, mimeType: i.mimeType }))
  );

  destSection.addWidget(
    CardService.newTextButton()
      .setText(t('main.select_dest_folder'))
      .setOnClickAction(
        CardService.newAction()
          .setFunctionName('openPickerAndPrepare')
          .setParameters({ itemsJson: itemsJson })
      )
  );

  if (destId) {
    destSection.addWidget(
      CardService.newTextButton()
        .setText(t('main.use_source_folder_default'))
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName('clearDestFolder')
            .setParameters({ itemsJson: itemsJson })
        )
    );
  }

  card.addSection(destSection);

  if (items.length > 0) {
    card.addSection(buildOptionsSection());
  }

  card.addSection(buildHistorySection(e, destId, items));

  if (items.length > 0) {
    const actionSection = CardService.newCardSection();

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
  const params = e.parameters;
  const items = JSON.parse(params.itemsJson);
  const userProps = PropertiesService.getUserProperties();
  const destId = userProps.getProperty('destFolderId');

  const formInputs = e.formInputs || {};

  const prefix = formInputs.prefix ? formInputs.prefix[0] : '';
  const suffix = formInputs.suffix ? formInputs.suffix[0] : '';
  const search = formInputs.search ? formInputs.search[0] : '';
  const replace = formInputs.replace ? formInputs.replace[0] : '';
  const conflict_resolution = formInputs.conflict_resolution ? formInputs.conflict_resolution[0] : 'rename';
  const filter_type = formInputs.filter_type ? formInputs.filter_type[0] : 'all';
  const preserve_perms = formInputs.preserve_perms ? (formInputs.preserve_perms[0] === 'true') : false;
  const dry_run = formInputs.dry_run ? (formInputs.dry_run[0] === 'true') : false;

  const options = {
    prefix: prefix,
    suffix: suffix,
    search: search,
    replace: replace,
    conflict_resolution: conflict_resolution,
    filter_type: filter_type,
    preserve_perms: preserve_perms,
    dry_run: dry_run
  };

  const report = processCopies(items, destId, options);

  let msg = '';
  if (dry_run) {
    msg += '⚠️ ' + t('simulation.msg') + '\n\n';
    if (report.simulationLogs.length > 0) {
      msg += report.simulationLogs.join('\n');
    } else {
      msg += 'No items simulated.';
    }
  } else {
    if (report.results.length > 0) {
      msg += t('main.copied', { count: report.results.length }) + '\n' + report.results.join('\n');
      addCopyHistoryEntry('Copied: ' + report.results.length + ' items');
    }
    if (report.errors.length > 0) {
      msg += '\n❌ ' + t('main.errors', { count: report.errors.length }) + '\n' + report.errors.join('\n');
      if (report.results.length === 0) {
        addCopyHistoryEntry('Failed: ' + report.errors.length + ' errors');
      }
    }
  }

  const title = dry_run ? t('simulation.report_title') : t('main.copy_result');

  const resultCard = CardService.newCardBuilder()
    .setName('result')
    .setHeader(CardService.newCardHeader().setTitle(title))
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
  return 'https://script.google.com/macros/s/AKfycbymGig4e7Mza9Hr9-0zo-ra2QSzMMh9foeTEGpK-6_D/dev?page=picker';
}

function saveFolderSelection(folderId, folderName) {
  const props = PropertiesService.getUserProperties();
  props.setProperty('destFolderId', folderId);
  props.setProperty('destFolderName', folderName);
  addRecentFolder(folderId, folderName);
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
